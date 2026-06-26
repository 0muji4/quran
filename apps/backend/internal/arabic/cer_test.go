package arabic

import "testing"

func TestCER(t *testing.T) {
	cases := []struct {
		name     string
		ref, hyp string
		want     float64
	}{
		{"identical (whitespace ignored)", "السلام عليكم", "السلام عليكم", 0},
		{"diacritics ignored", "بِسْمِ", "بسم", 0},
		{"one substitution", "abc", "abx", 1.0 / 3.0},
		{"both empty", "", "", 0},
		{"empty reference", "", "x", 1},
		{"empty hypothesis", "abc", "", 1},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := CER(c.ref, c.hyp)
			if d := got - c.want; d > 1e-9 || d < -1e-9 {
				t.Fatalf("CER(%q, %q) = %v, want %v", c.ref, c.hyp, got, c.want)
			}
		})
	}
}
