package persona

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

// Persona defines a bot's identity and review perspective.
type Persona struct {
	Name         string `yaml:"name"`
	Description  string `yaml:"description"`
	SystemPrompt string `yaml:"system_prompt"`
}

// Load reads a persona definition from a YAML file.
func Load(path string) (*Persona, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read persona file %s: %w", path, err)
	}

	var p Persona
	if err := yaml.Unmarshal(data, &p); err != nil {
		return nil, fmt.Errorf("failed to parse persona file %s: %w", path, err)
	}

	return &p, nil
}
