variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Cloud Run region for the collector."
  type        = string
}

variable "name" {
  description = "Cloud Run service name for the collector."
  type        = string
  default     = "otel-collector"
}

variable "image" {
  description = "OTel Collector container image. Pin a specific digest in prod."
  type        = string
  default     = "otel/opentelemetry-collector-contrib:0.95.0"
}

variable "service_account_email" {
  description = "Service account used by the collector revision. Must have roles/cloudtrace.agent, logging.logWriter, monitoring.metricWriter."
  type        = string
}

variable "min_instances" {
  description = "Minimum warm instances. 1 keeps spans flowing without cold starts."
  type        = number
  default     = 1
}

variable "max_instances" {
  description = "Maximum autoscaled instances."
  type        = number
  default     = 5
}

variable "allow_unauthenticated_otlp" {
  description = "If true, allUsers can POST OTLP. Most setups keep this false and rely on signed identity tokens."
  type        = bool
  default     = false
}
