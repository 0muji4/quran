variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "secret_id" {
  description = "Secret Manager secret ID."
  type        = string
}

variable "replication_locations" {
  description = "Region list for user-managed replication. Empty list uses automatic replication."
  type        = list(string)
  default     = []
}

variable "accessors" {
  description = "Service account emails that should be granted roles/secretmanager.secretAccessor."
  type        = list(string)
  default     = []
}
