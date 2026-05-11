output "pool_name" {
  description = "Full resource name of the workload identity pool."
  value       = google_iam_workload_identity_pool.this.name
}

output "provider_name" {
  description = "Full resource name of the OIDC provider — wire this into the GitHub Actions auth step."
  value       = google_iam_workload_identity_pool_provider.github.name
}
