output "name" {
  description = "Cloud Run service name."
  value       = google_cloud_run_v2_service.this.name
}

output "uri" {
  description = "Default-routed HTTPS URL exposed by Cloud Run."
  value       = google_cloud_run_v2_service.this.uri
}

output "location" {
  description = "Region the service is deployed to."
  value       = google_cloud_run_v2_service.this.location
}
