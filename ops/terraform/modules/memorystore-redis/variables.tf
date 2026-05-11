variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Memorystore region (e.g. asia-northeast1)."
  type        = string
}

variable "name" {
  description = "Redis instance name."
  type        = string
}

variable "tier" {
  description = "Service tier. ADR 0010 specifies BASIC."
  type        = string
  default     = "BASIC"
}

variable "memory_size_gb" {
  description = "Capacity in GiB. ADR 0010 specifies 1."
  type        = number
  default     = 1
}

variable "redis_version" {
  description = "Redis major.minor version."
  type        = string
  default     = "REDIS_7_2"
}

variable "authorized_network" {
  description = "Self-link of the VPC the instance attaches to."
  type        = string
}

variable "connect_mode" {
  description = "Connect mode. PRIVATE_SERVICE_ACCESS keeps the instance off the public internet."
  type        = string
  default     = "PRIVATE_SERVICE_ACCESS"
}
