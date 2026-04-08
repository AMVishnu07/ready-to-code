package scanner

import (
	"fmt"
	"os/exec"
	"strings"
)

// ScanSystem scans the system for installed software and dependencies.
func ScanSystem() (map[string]string, error) {
	installed := make(map[string]string)

	// Example command to list installed packages (this may vary by OS)
	cmd := exec.Command("dpkg", "--get-selections") // For Debian-based systems
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to execute command: %v", err)
	}

	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if line != "" {
			parts := strings.Fields(line)
			if len(parts) > 0 {
				installed[parts[0]] = "installed"
			}
		}
	}

	return installed, nil
}