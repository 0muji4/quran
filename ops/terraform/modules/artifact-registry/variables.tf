variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "location" {
  description = "Artifact Registry location. ADR 0010 pins asia-northeast1."
  type        = string
  default     = "asia-northeast1"
}

variable "repository_id" {
  description = "Repository ID (no slashes)."
  type        = string
}

variable "description" {
  description = "Human-readable description."
  type        = string
  default     = "Docker images for the quran-project services"
}

variable "format" {
  description = "Repository format. ADR 0010 uses DOCKER."
  type        = string
  default     = "DOCKER"
}

variable "immutable_tags" {
  description = "If true, tags cannot be re-pointed once pushed."
  type        = bool
  default     = true
}
