package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"quran-project/apps/backend/internal/lsp"
	"strings"
)

func main() {
	// 1. プロジェクトルートの取得
	wd, err := os.Getwd()
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Initializing L5 Agent (LSP Client)...")

	// 2. LSPクライアントの起動
	client, err := lsp.NewClient(wd)
	if err != nil {
		log.Fatalf("Failed to start LSP client: %v", err)
	}
	defer client.Close()

	// 3. ターゲットの決定 (今回は自分自身)
	relativePath := "cmd/llm_reviewer/main.go"
	targetFile := filepath.Join(wd, relativePath)

	// 動的に func main() を探すロジック（そのまま再利用）
	targetLine := 0
	targetChar := 5
	content, err := os.ReadFile(targetFile)
	if err != nil {
		log.Fatal(err)
	}
	lines := strings.Split(string(content), "\n")
	found := false
	for i, line := range lines {
		if strings.HasPrefix(line, "func main()") {
			targetLine = i
			found = true
			break
		}
	}
	if !found {
		log.Fatal("Could not find 'func main()' in the file.")
	}

	// 4. 参照検索の実行
	fmt.Printf("Analyzing references for %s at line %d...\n", relativePath, targetLine+1)

	refs, err := client.References(targetFile, targetLine, targetChar)
	if err != nil {
		log.Fatalf("LSP Query failed: %v", err)
	}

	// 5. 結果表示
	fmt.Printf("\nFound %d references:\n", len(refs))
	for _, ref := range refs {
		// 表示を見やすく整形
		path := strings.TrimPrefix(ref.URI, "file://")
		// プロジェクトルートからの相対パスに変換して表示
		if rel, err := filepath.Rel(wd, path); err == nil {
			path = rel
		}
		fmt.Printf("- %s (Line: %d)\n", path, ref.Range.Start.Line+1)
	}
}
