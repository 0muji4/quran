package main

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"quran-project/apps/backend/internal/agent"
	"quran-project/apps/backend/internal/lsp"
	"quran-project/apps/backend/internal/symbol"
	"quran-project/apps/backend/internal/workspace"
)

func main() {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Fatal("Please set GEMINI_API_KEY environment variable")
	}

	ctx := context.Background()

	wd, err := os.Getwd()
	if err != nil {
		log.Fatal(err)
	}

	// 1. LSPの起動 (The Eyes)
	fmt.Println("Initializing LSP (gopls)...")
	lspClient, err := lsp.NewClient(wd)
	if err != nil {
		log.Fatalf("Failed to start LSP: %v", err)
	}
	defer lspClient.Close()

	// 2. Workspace Tools (The Hands)
	fsReader := workspace.NewFSReader(wd)
	gitDiff := workspace.NewGitDiff(wd)

	// 3. Symbol Resolver (The Navigator)
	astResolver := symbol.NewASTResolver(wd)

	// 4. Agentの起動 (The Brain)
	fmt.Println("Initializing L5 Agent...")
	bot, err := agent.NewL5Agent(ctx, apiKey, wd, lspClient, fsReader, gitDiff, astResolver)
	if err != nil {
		log.Fatalf("Failed to create agent: %v", err)
	}

	// 5. インタラクティブモード
	reader := bufio.NewReader(os.Stdin)
	fmt.Println("\n--- Google L5 Go Engineer Bot (Ready) ---")
	fmt.Println("例: cmd/llm_reviewer/main.go の 16行目の5文字目にある関数の参照元を教えて")

	for {
		fmt.Print("\nUser > ")
		input, _ := reader.ReadString('\n')
		input = strings.TrimSpace(input)

		if input == "exit" || input == "quit" {
			break
		}
		if input == "" {
			continue
		}

		response, err := bot.Run(ctx, input)
		if err != nil {
			fmt.Printf("Error: %v\n", err)
			continue
		}

		fmt.Printf("\nL5 Bot > %s\n", response)
	}
}
