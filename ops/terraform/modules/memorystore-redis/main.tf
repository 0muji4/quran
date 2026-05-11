resource "google_redis_instance" "this" {
  project        = var.project_id
  region         = var.region
  name           = var.name
  tier           = var.tier
  memory_size_gb = var.memory_size_gb
  redis_version  = var.redis_version

  authorized_network = var.authorized_network
  connect_mode       = var.connect_mode

  transit_encryption_mode = "DISABLED"
}
