package fixer

import (
	"fmt"
	"os/exec"
)

// Fixer provides methods to fix identified issues and install missing dependencies.
type Fixer struct{}

// New creates a new instance of Fixer.
func New() *Fixer {
	return &Fixer{}
}

// InstallDependency installs a missing dependency using the system's package manager.
func (f *Fixer) InstallDependency(dependency string) error {
	cmd := exec.Command("go", "get", dependency)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install dependency %s: %w", dependency, err)
	}
	return nil
}

// FixIssues scans for issues and attempts to fix them.
func (f *Fixer) FixIssues(issues []string) error {
	for _, issue := range issues {
		if err := f.InstallDependency(issue); err != nil {
			return err
		}
	}
	return nil
}