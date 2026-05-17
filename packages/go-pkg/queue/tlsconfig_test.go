package queue

import (
	"crypto/tls"
	"testing"
)

func TestPrepareTLSConfig(t *testing.T) {
	tests := []struct {
		name           string
		addr           string
		base           *tls.Config
		wantServerName string
		wantInsecure   bool
	}{
		{
			name:           "nil base populates ServerName from host:port",
			addr:           "redis.example.com:6379",
			base:           nil,
			wantServerName: "redis.example.com",
		},
		{
			name:           "nil base populates ServerName from bare host",
			addr:           "redis.example.com",
			base:           nil,
			wantServerName: "redis.example.com",
		},
		{
			name:           "empty base ServerName is filled from addr",
			addr:           "primary.redis:6380",
			base:           &tls.Config{InsecureSkipVerify: true},
			wantServerName: "primary.redis",
			wantInsecure:   true,
		},
		{
			name:           "base ServerName takes precedence",
			addr:           "redis.example.com:6379",
			base:           &tls.Config{ServerName: "override.test"},
			wantServerName: "override.test",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Snapshot the caller's pointer to verify prepareTLSConfig
			// does not mutate it (clone semantics).
			var beforeInsecure bool
			if tc.base != nil {
				beforeInsecure = tc.base.InsecureSkipVerify
			}

			got := prepareTLSConfig(tc.addr, tc.base)

			if got == nil {
				t.Fatal("prepareTLSConfig returned nil")
			}
			if got.ServerName != tc.wantServerName {
				t.Errorf("ServerName = %q, want %q", got.ServerName, tc.wantServerName)
			}
			if got.InsecureSkipVerify != tc.wantInsecure {
				t.Errorf("InsecureSkipVerify = %v, want %v", got.InsecureSkipVerify, tc.wantInsecure)
			}
			if tc.base != nil && tc.base.InsecureSkipVerify != beforeInsecure {
				t.Errorf("base mutated; InsecureSkipVerify went %v -> %v",
					beforeInsecure, tc.base.InsecureSkipVerify)
			}
		})
	}
}
