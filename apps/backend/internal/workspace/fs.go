package workspace

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

var _ FileReader = (*FSReader)(nil)

// FSReader reads files from the local filesystem.
type FSReader struct {
	rootPath string
}

func NewFSReader(rootPath string) *FSReader {
	return &FSReader{rootPath: rootPath}
}

func (r *FSReader) ReadFile(relPath string) (string, error) {
	absPath := filepath.Join(r.rootPath, relPath)
	absPath = filepath.Clean(absPath)

	// パストラバーサル防止
	if !strings.HasPrefix(absPath, r.rootPath) {
		return "", fmt.Errorf("path %q is outside project root", relPath)
	}

	data, err := os.ReadFile(absPath)
	if err != nil {
		return "", err
	}
	return string(data), nil
}
