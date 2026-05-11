resource "google_secret_manager_secret" "this" {
  project   = var.project_id
  secret_id = var.secret_id

  replication {
    dynamic "auto" {
      for_each = length(var.replication_locations) == 0 ? [1] : []
      content {}
    }

    dynamic "user_managed" {
      for_each = length(var.replication_locations) == 0 ? [] : [var.replication_locations]
      content {
        dynamic "replicas" {
          for_each = user_managed.value
          content {
            location = replicas.value
          }
        }
      }
    }
  }
}

resource "google_secret_manager_secret_iam_member" "accessors" {
  for_each = toset(var.accessors)

  project   = google_secret_manager_secret.this.project
  secret_id = google_secret_manager_secret.this.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${each.value}"
}
