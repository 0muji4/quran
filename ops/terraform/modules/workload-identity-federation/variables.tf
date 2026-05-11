variable "project_id" {
  description = "GCP project ID hosting the pool/provider."
  type        = string
}

variable "pool_id" {
  description = "Workload Identity Pool ID (4-32 chars)."
  type        = string
}

variable "provider_id" {
  description = "OIDC provider ID inside the pool."
  type        = string
}

variable "pool_display_name" {
  description = "Display name for the pool."
  type        = string
  default     = "GitHub Actions"
}

variable "github_repository" {
  description = "owner/repo string for the GitHub repository allowed to assume identities."
  type        = string
}

variable "allowed_branches" {
  description = "Branch names allowed to mint tokens (e.g. [\"develop\", \"main\"])."
  type        = list(string)
  default     = ["develop"]
}

variable "allowed_environments" {
  description = "GitHub deployment environments allowed (e.g. [\"staging\"]). Use [] to disable env scoping."
  type        = list(string)
  default     = []
}

variable "service_accounts" {
  description = "Service account emails that GitHub Actions may impersonate via this provider."
  type        = list(string)
}
