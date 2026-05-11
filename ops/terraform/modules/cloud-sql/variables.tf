variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Cloud SQL region (e.g. asia-northeast1)."
  type        = string
}

variable "name" {
  description = "Cloud SQL instance name."
  type        = string
}

variable "database_version" {
  description = "Postgres major version. ADR 0010 pins 16."
  type        = string
  default     = "POSTGRES_16"
}

variable "tier" {
  description = "Machine tier (e.g. db-custom-1-3840 for 1 vCPU / 3.75 GiB)."
  type        = string
  default     = "db-custom-1-3840"
}

variable "disk_size_gb" {
  description = "Initial disk size in GiB. Autoresize is enabled."
  type        = number
  default     = 20
}

variable "deletion_protection" {
  description = "Whether the instance is protected from deletion."
  type        = bool
  default     = true
}

variable "private_network" {
  description = "Self-link of the VPC the instance attaches to (private IP)."
  type        = string
}

variable "backup_start_time" {
  description = "UTC HH:MM for the daily backup window."
  type        = string
  default     = "16:00"
}

variable "database_name" {
  description = "Application database name created inside the instance."
  type        = string
  default     = "quran"
}

variable "app_user_name" {
  description = "Application Postgres user name."
  type        = string
  default     = "quran"
}

variable "app_user_password_secret_id" {
  description = "Secret Manager secret holding the app user's password."
  type        = string
}
