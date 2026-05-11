data "google_secret_manager_secret_version" "app_user_password" {
  project = var.project_id
  secret  = var.app_user_password_secret_id
}

resource "google_sql_database_instance" "this" {
  project          = var.project_id
  name             = var.name
  region           = var.region
  database_version = var.database_version

  deletion_protection = var.deletion_protection

  settings {
    tier              = var.tier
    availability_type = "ZONAL"
    disk_size         = var.disk_size_gb
    disk_autoresize   = true

    backup_configuration {
      enabled                        = true
      start_time                     = var.backup_start_time
      point_in_time_recovery_enabled = true
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.private_network
    }

    insights_config {
      query_insights_enabled  = true
      record_application_tags = true
    }
  }
}

resource "google_sql_database" "app" {
  project  = var.project_id
  instance = google_sql_database_instance.this.name
  name     = var.database_name
}

resource "google_sql_user" "app" {
  project  = var.project_id
  instance = google_sql_database_instance.this.name
  name     = var.app_user_name
  password = data.google_secret_manager_secret_version.app_user_password.secret_data
}
