output "repository_id" {
  description = "Repository ID."
  value       = google_artifact_registry_repository.this.repository_id
}

output "name" {
  description = "Full resource name of the repository."
  value       = google_artifact_registry_repository.this.name
}

output "docker_host" {
  description = "Hostname for `docker push <host>/<project>/<repo>/<image>:<tag>`."
  value       = "${google_artifact_registry_repository.this.location}-docker.pkg.dev"
}
