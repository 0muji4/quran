package lsp

// CodeAnalyzer defines operations for code structural analysis.
type CodeAnalyzer interface {
	References(filePath string, line, char int) ([]Location, error)
	Close() error
}
