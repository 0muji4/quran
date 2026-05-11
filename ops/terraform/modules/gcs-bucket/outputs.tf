output "name" {
  description = "Bucket name."
  value       = google_storage_bucket.this.name
}

output "url" {
  description = "gs:// URL of the bucket."
  value       = google_storage_bucket.this.url
}

output "self_link" {
  description = "Self-link of the bucket resource."
  value       = google_storage_bucket.this.self_link
}

output "hmac_access_id" {
  description = "HMAC access ID for S3-compatible access. Null when hmac_service_account_email is unset."
  value       = try(google_storage_hmac_key.this[0].access_id, null)
}

output "hmac_secret" {
  description = "HMAC secret for S3-compatible access. Treat as secret material."
  value       = try(google_storage_hmac_key.this[0].secret, null)
  sensitive   = true
}
