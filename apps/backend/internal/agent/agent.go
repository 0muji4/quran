package agent

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"quran-project/apps/backend/internal/lsp"
	"quran-project/apps/backend/internal/symbol"
	"quran-project/apps/backend/internal/workspace"

	"google.golang.org/genai"
)

const model = "gemini-2.5-flash"

// L5Agent はLLMとコード解析ツールを統括する構造体です
type L5Agent struct {
	client       *genai.Client
	analyzer     lsp.CodeAnalyzer
	reader       workspace.FileReader
	differ       workspace.DiffProvider
	resolver     symbol.Resolver
	systemPrompt string
	history      []*genai.Content
	rootPath     string
}

func NewL5Agent(
	ctx context.Context,
	apiKey string,
	rootPath string,
	systemPrompt string,
	analyzer lsp.CodeAnalyzer,
	reader workspace.FileReader,
	differ workspace.DiffProvider,
	resolver symbol.Resolver,
) (*L5Agent, error) {
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create genai client: %w", err)
	}

	return &L5Agent{
		client:       client,
		analyzer:     analyzer,
		reader:       reader,
		differ:       differ,
		resolver:     resolver,
		systemPrompt: systemPrompt,
		rootPath:     rootPath,
	}, nil
}

// Run はユーザーの問いかけに対してReActループを実行します
func (a *L5Agent) Run(ctx context.Context, userQuery string) (string, error) {
	a.history = append(a.history, genai.NewContentFromText(userQuery, "user"))

	tools := []*genai.Tool{
		{
			FunctionDeclarations: []*genai.FunctionDeclaration{
				{
					Name:        "find-references",
					Description: "指定されたファイル内の特定の行・文字位置にあるシンボルの参照元（References）を検索します。",
					Parameters: &genai.Schema{
						Type: genai.TypeObject,
						Properties: map[string]*genai.Schema{
							"file_path": {
								Type:        genai.TypeString,
								Description: "対象のファイルパス（プロジェクトルートからの相対パス）",
							},
							"line": {
								Type:        genai.TypeInteger,
								Description: "対象の行番号（1から始まる人間用の行番号）",
							},
							"character": {
								Type:        genai.TypeInteger,
								Description: "対象の文字位置（1から始まる文字カラム）",
							},
						},
						Required: []string{"file_path", "line", "character"},
					},
				},
				{
					Name:        "read-file",
					Description: "指定されたファイルの内容を読み取ります。コードの中身を確認したいときに使用してください。",
					Parameters: &genai.Schema{
						Type: genai.TypeObject,
						Properties: map[string]*genai.Schema{
							"file_path": {
								Type:        genai.TypeString,
								Description: "対象のファイルパス（プロジェクトルートからの相対パス）",
							},
						},
						Required: []string{"file_path"},
					},
				},
				{
					Name:        "get-diff",
					Description: "現在のGit差分（git diff HEAD）を取得します。コードレビューや変更内容の確認に使用してください。",
					Parameters: &genai.Schema{
						Type:       genai.TypeObject,
						Properties: map[string]*genai.Schema{},
					},
				},
				{
					Name:        "find-symbol",
					Description: "シンボル名（関数名、型名、変数名など）からソースコード上の定義位置（ファイルパス、行番号、文字位置）を検索します。シンボルの参照元を調べたいがファイルや行番号が不明な場合、まずこのツールで位置を特定してからfind_referencesを使ってください。",
					Parameters: &genai.Schema{
						Type: genai.TypeObject,
						Properties: map[string]*genai.Schema{
							"name": {
								Type:        genai.TypeString,
								Description: "検索するシンボル名（例: SurahService, NewClient, ListSurahs）",
							},
						},
						Required: []string{"name"},
					},
				},
			},
		},
	}

	config := &genai.GenerateContentConfig{
		Tools: tools,
		SystemInstruction: &genai.Content{
			Parts: []*genai.Part{genai.NewPartFromText(a.systemPrompt)},
		},
	}

	// ReAct Loop (最大5往復まで許可)
	for i := 0; i < 5; i++ {
		fmt.Println("Thinking...")
		resp, err := a.client.Models.GenerateContent(ctx, model, a.history, config)
		if err != nil {
			return "", fmt.Errorf("agent: generate content: %w", err)
		}

		functionCalls := resp.FunctionCalls()
		if len(functionCalls) == 0 {
			return resp.Text(), nil
		}

		a.history = append(a.history, resp.Candidates[0].Content)

		var responseParts []*genai.Part
		for _, call := range functionCalls {
			var resultText string
			var execErr error

			switch call.Name {
			case "find-references":
				filePath, _ := call.Args["file_path"].(string)
				line := int(call.Args["line"].(float64))
				char := int(call.Args["character"].(float64))
				fmt.Printf("Calling Tool: find_references(%s, %d, %d)\n", filePath, line, char)
				resultText, execErr = a.executeFindReferences(filePath, line, char)

			case "read-file":
				filePath, _ := call.Args["file_path"].(string)
				fmt.Printf("Calling Tool: read_file(%s)\n", filePath)
				resultText, execErr = a.reader.ReadFile(filePath)

			case "get-diff":
				fmt.Println("Calling Tool: get_diff")
				resultText, execErr = a.differ.Diff()
				if resultText == "" && execErr == nil {
					resultText = "No changes detected (working tree is clean)."
				}

			case "find-symbol":
				name, _ := call.Args["name"].(string)
				fmt.Printf("Calling Tool: find_symbol(%s)\n", name)
				resultText, execErr = a.executeFindSymbol(name)
			}

			if execErr != nil {
				resultText = fmt.Sprintf("Error: %v", execErr)
			}

			responseParts = append(responseParts, genai.NewPartFromFunctionResponse(
				call.Name,
				map[string]any{"result": resultText},
			))
		}

		a.history = append(a.history, &genai.Content{
			Role:  "tool",
			Parts: responseParts,
		})
	}

	return "", fmt.Errorf("agent: loop limit exceeded")
}

func (a *L5Agent) executeFindSymbol(name string) (string, error) {
	locations, err := a.resolver.FindSymbol(name)
	if err != nil {
		return "", fmt.Errorf("agent: find symbol %q: %w", name, err)
	}

	if len(locations) == 0 {
		return fmt.Sprintf("Symbol %q not found.", name), nil
	}

	var result []string
	for _, loc := range locations {
		result = append(result, fmt.Sprintf("%s:%d:%d", loc.FilePath, loc.Line, loc.Character))
	}

	output := fmt.Sprintf("Found symbol %q at:\n%s", name, strings.Join(result, "\n"))
	fmt.Printf("   -> %s\n", output)
	return output, nil
}

func (a *L5Agent) executeFindReferences(relPath string, line, char int) (string, error) {
	absPath := filepath.Join(a.rootPath, relPath)

	// LSPは 0-based index なので -1 する
	lspLine := line - 1
	lspChar := char - 1

	fmt.Printf("   -> Searching in %s at %d:%d\n", relPath, lspLine, lspChar)

	refs, err := a.analyzer.References(absPath, lspLine, lspChar)
	if err != nil {
		return "", fmt.Errorf("agent: find references %s:%d:%d: %w", relPath, line, char, err)
	}

	var result []string
	for _, ref := range refs {
		path := strings.TrimPrefix(ref.URI, "file://")
		if rel, err := filepath.Rel(a.rootPath, path); err == nil {
			path = rel
		}
		result = append(result, fmt.Sprintf("%s:%d", path, ref.Range.Start.Line+1))
	}

	if len(result) == 0 {
		return "No references found.", nil
	}

	output := fmt.Sprintf("Found references:\n%s", strings.Join(result, "\n"))
	fmt.Printf("   -> %s\n", output)
	return output, nil
}
