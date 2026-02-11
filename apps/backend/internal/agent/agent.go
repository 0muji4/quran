package agent

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"quran-project/apps/backend/internal/lsp"
	"quran-project/apps/backend/internal/workspace"

	"google.golang.org/genai"
)

const model = "gemini-2.5-flash"

// L5Agent はLLMとコード解析ツールを統括する構造体です
type L5Agent struct {
	client   *genai.Client
	analyzer lsp.CodeAnalyzer
	reader   workspace.FileReader
	differ   workspace.DiffProvider
	history  []*genai.Content
	rootPath string
}

func NewL5Agent(
	ctx context.Context,
	apiKey string,
	rootPath string,
	analyzer lsp.CodeAnalyzer,
	reader workspace.FileReader,
	differ workspace.DiffProvider,
) (*L5Agent, error) {
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create genai client: %w", err)
	}

	return &L5Agent{
		client:   client,
		analyzer: analyzer,
		reader:   reader,
		differ:   differ,
		rootPath: rootPath,
	}, nil
}

// Run はユーザーの問いかけに対してReActループを実行します
func (a *L5Agent) Run(ctx context.Context, userQuery string) (string, error) {
	a.history = append(a.history, genai.NewContentFromText(userQuery, "user"))

	tools := []*genai.Tool{
		{
			FunctionDeclarations: []*genai.FunctionDeclaration{
				{
					Name:        "find_references",
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
					Name:        "read_file",
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
					Name:        "get_diff",
					Description: "現在のGit差分（git diff HEAD）を取得します。コードレビューや変更内容の確認に使用してください。",
					Parameters: &genai.Schema{
						Type:       genai.TypeObject,
						Properties: map[string]*genai.Schema{},
					},
				},
			},
		},
	}

	config := &genai.GenerateContentConfig{
		Tools: tools,
		SystemInstruction: genai.NewContentFromText(
			"あなたはGoogleのL5ソフトウェアエンジニアです。Go言語のエキスパートとして振る舞ってください。"+
				"コードの変更や関数について聞かれたときは、必ずツールを使って事実を確認してから回答してください。"+
				"推測で回答することは許されません。「事実はコードにある」が信条です。"+
				"ファイルの中身を確認するには「read_file」、参照検索には「find_references」、Git差分の確認には「get_diff」を使ってください。",
			"user",
		),
	}

	// ReAct Loop (最大5往復まで許可)
	for i := 0; i < 5; i++ {
		fmt.Println("Thinking...")
		resp, err := a.client.Models.GenerateContent(ctx, model, a.history, config)
		if err != nil {
			return "", err
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
			case "find_references":
				filePath, _ := call.Args["file_path"].(string)
				line := int(call.Args["line"].(float64))
				char := int(call.Args["character"].(float64))
				fmt.Printf("Calling Tool: find_references(%s, %d, %d)\n", filePath, line, char)
				resultText, execErr = a.executeFindReferences(filePath, line, char)

			case "read_file":
				filePath, _ := call.Args["file_path"].(string)
				fmt.Printf("Calling Tool: read_file(%s)\n", filePath)
				resultText, execErr = a.reader.ReadFile(filePath)

			case "get_diff":
				fmt.Println("Calling Tool: get_diff")
				resultText, execErr = a.differ.Diff()
				if resultText == "" && execErr == nil {
					resultText = "No changes detected (working tree is clean)."
				}
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

	return "", fmt.Errorf("loop limit exceeded")
}

func (a *L5Agent) executeFindReferences(relPath string, line, char int) (string, error) {
	absPath := filepath.Join(a.rootPath, relPath)

	// LSPは 0-based index なので -1 する
	lspLine := line - 1
	lspChar := char - 1

	fmt.Printf("   -> Searching in %s at %d:%d\n", relPath, lspLine, lspChar)

	refs, err := a.analyzer.References(absPath, lspLine, lspChar)
	if err != nil {
		return "", err
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
