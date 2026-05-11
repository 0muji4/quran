output "email" {
  description = "Service account email."
  value       = google_service_account.this.email
}

output "id" {
  description = "Fully qualified service account resource ID."
  value       = google_service_account.this.id
}

output "unique_id" {
  description = "Numeric unique ID assigned by GCP."
  value       = google_service_account.this.unique_id
}
