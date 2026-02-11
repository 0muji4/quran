package workspace

import (
	"os/exec"
)

var _ DiffProvider = (*GitDiff)(nil)

// GitDiff retrieves diffs from a local git repository.
type GitDiff struct {
	rootPath string
}

func NewGitDiff(rootPath string) *GitDiff {
	return &GitDiff{rootPath: rootPath}
}

func (g *GitDiff) Diff() (string, error) {
	cmd := exec.Command("git", "diff", "HEAD")
	cmd.Dir = g.rootPath

	out, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return string(out), nil
}
