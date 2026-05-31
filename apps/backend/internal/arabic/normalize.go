// Package arabic provides utilities for comparing Arabic Quranic text:
// diacritic normalization, Word Error Rate, and word-level alignment.
package arabic

import "strings"

// Normalize strips Arabic diacritics (tashkeel) so spellings with or without
// vocalisation marks compare equal. Covers U+064B–U+065F, U+0670, U+06D6–U+06ED.
func Normalize(text string) string {
	var b strings.Builder
	b.Grow(len(text))
	for _, r := range text {
		if isDiacritic(r) {
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}

func isDiacritic(r rune) bool {
	switch {
	case r >= 0x064B && r <= 0x065F:
		return true
	case r == 0x0670:
		return true
	case r >= 0x06D6 && r <= 0x06ED:
		return true
	}
	return false
}

// tokenize splits normalized text on whitespace, dropping empty tokens.
func tokenize(text string) []string {
	return strings.Fields(strings.TrimSpace(text))
}
