// Command healthcheck is a tiny HTTP client invoked by Docker HEALTHCHECK
// in distroless images (which have no shell, curl, or wget). It probes the
// backend's /healthz endpoint on localhost and exits 0 on HTTP 200, 1
// otherwise. The port is read from the PORT env var so it tracks the
// server's runtime configuration in Cloud Run.
package main

import (
	"net/http"
	"os"
	"time"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get("http://127.0.0.1:" + port + "/healthz")
	if err != nil {
		os.Exit(1)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		os.Exit(1)
	}
}
