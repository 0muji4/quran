variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "account_id" {
  description = "Service account ID (6-30 chars, lowercase alphanumeric + hyphens)."
  type        = string
}

variable "display_name" {
  description = "Display name shown in the console."
  type        = string
}

variable "description" {
  description = "Free-form description."
  type        = string
  default     = ""
}

variable "roles" {
  description = "List of IAM roles to bind to this service account at the project level."
  type        = list(string)
  default     = []
}
