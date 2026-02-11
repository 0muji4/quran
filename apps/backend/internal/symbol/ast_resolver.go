package symbol

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"
)

var _ Resolver = (*ASTResolver)(nil)

// ASTResolver resolves symbol names to source locations using go/ast.
type ASTResolver struct {
	rootPath string
}

func NewASTResolver(rootPath string) *ASTResolver {
	return &ASTResolver{rootPath: rootPath}
}

func (r *ASTResolver) FindSymbol(name string) ([]SymbolLocation, error) {
	var results []SymbolLocation
	fset := token.NewFileSet()

	err := filepath.WalkDir(r.rootPath, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}

		// ディレクトリのスキップ
		if d.IsDir() {
			base := d.Name()
			if base == "vendor" || base == ".git" || base == "node_modules" {
				return filepath.SkipDir
			}
			return nil
		}

		// .goファイルのみ、テストファイルは除外
		if !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}

		f, err := parser.ParseFile(fset, path, nil, 0)
		if err != nil {
			return nil
		}

		ast.Inspect(f, func(n ast.Node) bool {
			switch node := n.(type) {
			case *ast.FuncDecl:
				if node.Name.Name == name {
					pos := fset.Position(node.Name.Pos())
					relPath, _ := filepath.Rel(r.rootPath, pos.Filename)
					results = append(results, SymbolLocation{
						FilePath:  relPath,
						Line:      pos.Line,
						Character: pos.Column,
					})
				}
			case *ast.TypeSpec:
				if node.Name.Name == name {
					pos := fset.Position(node.Name.Pos())
					relPath, _ := filepath.Rel(r.rootPath, pos.Filename)
					results = append(results, SymbolLocation{
						FilePath:  relPath,
						Line:      pos.Line,
						Character: pos.Column,
					})
				}
			case *ast.ValueSpec:
				for _, ident := range node.Names {
					if ident.Name == name {
						pos := fset.Position(ident.Pos())
						relPath, _ := filepath.Rel(r.rootPath, pos.Filename)
						results = append(results, SymbolLocation{
							FilePath:  relPath,
							Line:      pos.Line,
							Character: pos.Column,
						})
					}
				}
			}
			return true
		})

		return nil
	})

	return results, err
}
