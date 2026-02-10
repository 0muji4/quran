package lsp

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
)

var _ CodeAnalyzer = (*Client)(nil)

// Client は gopls プロセスを管理する構造体です
type Client struct {
	cmd    *exec.Cmd
	stdin  io.WriteCloser
	stdout *bufio.Reader
	mutex  sync.Mutex
	idSeq  int
}

// NewClient は gopls を起動し、Initialize まで完了させてクライアントを返します
func NewClient(rootPath string) (*Client, error) {
	absRoot, err := filepath.Abs(rootPath)
	if err != nil {
		return nil, err
	}

	// goplsコマンドの存在確認 (任意)
	if _, err := exec.LookPath("gopls"); err != nil {
		return nil, fmt.Errorf("gopls not found: %w", err)
	}

	cmd := exec.Command("gopls")
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}
	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}

	// 標準エラー出力もキャプチャしておくとデバッグ時に役立ちます
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return nil, err
	}

	client := &Client{
		cmd:    cmd,
		stdin:  stdin,
		stdout: bufio.NewReader(stdoutPipe),
	}

	// Initialize Handshake
	// RootURI を正しく設定することが重要です
	initParams := InitializeParams{
		ProcessID: os.Getpid(),
		RootURI:   "file://" + absRoot,
	}

	if _, err := client.sendRequest("initialize", initParams); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("failed to initialize: %w", err)
	}

	// Initialized Notification
	client.sendNotification("initialized", struct{}{})

	return client, nil
}

func (c *Client) Close() error {
	if c.cmd.Process != nil {
		return c.cmd.Process.Kill()
	}
	return nil
}

// References は指定されたファイル・位置の参照元を検索します
func (c *Client) References(filePath string, line, char int) ([]Location, error) {
	absPath, err := filepath.Abs(filePath)
	if err != nil {
		return nil, err
	}

	params := ReferenceParams{
		TextDocumentPositionParams: TextDocumentPositionParams{
			TextDocument: TextDocumentIdentifier{URI: "file://" + absPath},
			Position:     Position{Line: line, Character: char},
		},
		Context: ReferenceContext{IncludeDeclaration: true},
	}

	resp, err := c.sendRequest("textDocument/references", params)
	if err != nil {
		return nil, err
	}

	var locations []Location
	if err := json.Unmarshal(resp, &locations); err != nil {
		return nil, fmt.Errorf("failed to parse references: %w", err)
	}

	return locations, nil
}

// --- Internal Helpers ---

func (c *Client) sendRequest(method string, params interface{}) (json.RawMessage, error) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	c.idSeq++
	id := c.idSeq

	req := JSONRPCRequest{
		JSONRPC: "2.0",
		ID:      id,
		Method:  method,
		Params:  params,
	}
	body, _ := json.Marshal(req)
	fmt.Fprintf(c.stdin, "Content-Length: %d\r\n\r\n%s", len(body), body)

	return c.readResponse()
}

func (c *Client) sendNotification(method string, params interface{}) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	req := JSONRPCRequest{
		JSONRPC: "2.0",
		Method:  method,
		Params:  params,
	}
	body, _ := json.Marshal(req)
	fmt.Fprintf(c.stdin, "Content-Length: %d\r\n\r\n%s", len(body), body)
}

func (c *Client) readResponse() (json.RawMessage, error) {
	var length int
	for {
		line, err := c.stdout.ReadString('\n')
		if err != nil {
			return nil, err
		}
		line = strings.TrimSpace(line)
		if line == "" {
			break
		}
		if strings.HasPrefix(line, "Content-Length: ") {
			length, _ = strconv.Atoi(strings.TrimPrefix(line, "Content-Length: "))
		}
	}

	body := make([]byte, length)
	_, err := io.ReadFull(c.stdout, body)
	if err != nil {
		return nil, err
	}

	var base struct {
		Result json.RawMessage `json:"result"`
		Error  interface{}     `json:"error"`
	}
	if err := json.Unmarshal(body, &base); err != nil {
		return nil, err
	}

	if base.Error != nil {
		return nil, fmt.Errorf("lsp error: %v", base.Error)
	}

	// Notification(Resultがnil)ならスキップして次を読む
	if base.Result == nil {
		return c.readResponse()
	}

	return base.Result, nil
}
