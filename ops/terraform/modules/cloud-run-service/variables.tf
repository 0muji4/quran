variable "project_id" {
  description = "GCP project ID hosting this service."
  type        = string
}

variable "region" {
  description = "Cloud Run region (e.g. asia-northeast1)."
  type        = string
}

variable "name" {
  description = "Cloud Run service name (also used as the URL prefix)."
  type        = string
}

variable "image" {
  description = "Fully qualified container image including tag/digest."
  type        = string
}

variable "service_account_email" {
  description = "Runtime service account for the Cloud Run revision."
  type        = string
}

variable "container_port" {
  description = "Port the container listens on."
  type        = number
  default     = 8080
}

variable "env" {
  description = "Plain environment variables forwarded to the container."
  type        = map(string)
  default     = {}
}

variable "secret_env" {
  description = "Secret Manager-backed env vars. Map of env var name -> { secret_id, version }."
  type = map(object({
    secret_id = string
    version   = string
  }))
  default = {}
}

variable "min_instances" {
  description = "Minimum number of warm instances. Set >= 1 for always-on workers."
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum autoscaled instances."
  type        = number
  default     = 10
}

variable "cpu" {
  description = "CPU per instance (e.g. \"1\", \"2\")."
  type        = string
  default     = "1"
}

variable "memory" {
  description = "Memory per instance (e.g. \"512Mi\", \"1Gi\")."
  type        = string
  default     = "512Mi"
}

variable "cpu_always_allocated" {
  description = "If true, CPU is always allocated (required for background workers)."
  type        = bool
  default     = false
}

variable "allow_unauthenticated" {
  description = "If true, grants roles/run.invoker to allUsers. Edge services only."
  type        = bool
  default     = false
}

variable "vpc_connector" {
  description = "Optional Serverless VPC Access connector name for private SQL/Redis."
  type        = string
  default     = null
}

variable "startup_probe_path" {
  description = "HTTP path for the startup probe (also used by liveness)."
  type        = string
  default     = "/healthz"
}
