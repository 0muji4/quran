output "name" {
  description = "Collector Cloud Run service name."
  value       = google_cloud_run_v2_service.this.name
}

output "uri" {
  description = "HTTPS endpoint of the collector — wire this into OTEL_EXPORTER_OTLP_ENDPOINT."
  value       = google_cloud_run_v2_service.this.uri
}
