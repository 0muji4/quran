package workspace

// FileReader defines operations for reading source files.
type FileReader interface {
	ReadFile(path string) (string, error)
}

// DiffProvider defines operations for retrieving git diffs.
type DiffProvider interface {
	Diff() (string, error)
}
