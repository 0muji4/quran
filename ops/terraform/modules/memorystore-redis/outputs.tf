output "host" {
  description = "Primary endpoint host of the Redis instance."
  value       = google_redis_instance.this.host
}

output "port" {
  description = "Primary endpoint port of the Redis instance."
  value       = google_redis_instance.this.port
}

output "redis_url" {
  description = "redis:// URL ready to be wired into REDIS_URL env."
  value       = "redis://${google_redis_instance.this.host}:${google_redis_instance.this.port}"
}
