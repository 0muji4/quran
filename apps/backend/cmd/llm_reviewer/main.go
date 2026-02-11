package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"quran-project/apps/backend/internal/agent"
	"quran-project/apps/backend/internal/lsp"
	"quran-project/apps/backend/internal/persona"
	"quran-project/apps/backend/internal/symbol"
	"quran-project/apps/backend/internal/workspace"
)

func main() {
	personaName := flag.String("persona", "architect", "ペルソナ名 (architect, go-expert)")
	flag.Parse()

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Fatal("Please set GEMINI_API_KEY environment variable")
	}

	ctx := context.Background()

	wd, err := os.Getwd()
	if err != nil {
		log.Fatal(err)
	}

	// 1. ペルソナの読み込み
	personaPath := filepath.Join(wd, "configs", "personas", *personaName+".yaml")
	p, err := persona.Load(personaPath)
	if err != nil {
		log.Fatalf("Failed to load persona %q: %v", *personaName, err)
	}
	fmt.Printf("Persona: %s (%s)\n", p.Name, p.Description)

	// 2. LSPの起動 (The Eyes)
	fmt.Println("Initializing LSP (gopls)...")
	lspClient, err := lsp.NewClient(wd)
	if err != nil {
		log.Fatalf("Failed to start LSP: %v", err)
	}
	defer lspClient.Close()

	// 3. Workspace Tools (The Hands)
	fsReader := workspace.NewFSReader(wd)
	gitDiff := workspace.NewGitDiff(wd)

	// 4. Symbol Resolver (The Navigator)
	astResolver := symbol.NewASTResolver(wd)

	// 5. Agentの起動 (The Brain)
	fmt.Println("Initializing Agent...")
	bot, err := agent.NewL5Agent(ctx, apiKey, wd, p.SystemPrompt, lspClient, fsReader, gitDiff, astResolver)
	if err != nil {
		log.Fatalf("Failed to create agent: %v", err)
	}

	// 6. インタラクティブモード
	reader := bufio.NewReader(os.Stdin)
	fmt.Printf("\n--- %s Bot (Ready) ---\n", p.Name)

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

		fmt.Printf("\n%s > %s\n", p.Name, response)
	}
}
