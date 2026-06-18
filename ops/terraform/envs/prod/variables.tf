variable "project_id" {
  description = "GCP project ID hosting the prod environment."
  type        = string
}

variable "region" {
  description = "GCP region for regional resources."
  type        = string
  default     = "asia-northeast1"
}

variable "github_repository" {
  description = "owner/repo string for GHA OIDC federation."
  type        = string
}

variable "vpc_network_self_link" {
  description = "Self-link of the VPC that Cloud SQL + Memorystore attach to."
  type        = string
}

variable "vpc_authorized_network" {
  description = "Network resource path for Memorystore authorized_network."
  type        = string
}

variable "container_images" {
  description = "Container image references per app, keyed by service name."
  type = object({
    backend = string
    bff     = string
    web     = string
  })
}

variable "db_password_secret_id" {
  description = "Secret Manager secret ID for the Postgres app user password."
  type        = string
  default     = "quran-db-password"
}
