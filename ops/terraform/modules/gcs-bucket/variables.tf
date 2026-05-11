variable "project_id" {
  description = "GCP project ID hosting this bucket."
  type        = string
}

variable "location" {
  description = "Bucket location (region or multi-region)."
  type        = string
}

variable "name" {
  description = "Bucket name. Must be globally unique."
  type        = string
}

variable "storage_class" {
  description = "Default storage class for new objects."
  type        = string
  default     = "STANDARD"
}

variable "versioning_enabled" {
  description = "Whether to enable object versioning."
  type        = bool
  default     = true
}

variable "force_destroy" {
  description = "Allow Terraform to delete the bucket even when non-empty. Keep false in prod."
  type        = bool
  default     = false
}

variable "uniform_bucket_level_access" {
  description = "If true, disables per-object ACLs (recommended)."
  type        = bool
  default     = true
}

variable "lifecycle_age_days" {
  description = "Age in days after which objects are deleted. 0 disables the lifecycle rule."
  type        = number
  default     = 0
}

variable "cors_origins" {
  description = "Allowed CORS origins. Empty disables CORS."
  type        = list(string)
  default     = []
}

variable "hmac_service_account_email" {
  description = "Optional service account email to generate an HMAC key for (S3-compatible access). Null skips HMAC."
  type        = string
  default     = null
}
