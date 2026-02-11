package symbol

// SymbolLocation represents where a symbol is defined.
type SymbolLocation struct {
	FilePath  string // プロジェクトルートからの相対パス
	Line      int    // 1-based
	Character int    // 1-based
}

// Resolver finds symbol definitions by name.
type Resolver interface {
	FindSymbol(name string) ([]SymbolLocation, error)
}
