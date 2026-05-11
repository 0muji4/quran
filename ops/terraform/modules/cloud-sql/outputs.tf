output "instance_name" {
  description = "Cloud SQL instance name."
  value       = google_sql_database_instance.this.name
}

output "connection_name" {
  description = "project:region:instance string used by the Cloud SQL Auth Proxy."
  value       = google_sql_database_instance.this.connection_name
}

output "private_ip_address" {
  description = "Private IP address assigned to the instance."
  value       = google_sql_database_instance.this.private_ip_address
}

output "database_name" {
  description = "Application database name."
  value       = google_sql_database.app.name
}

output "app_user" {
  description = "Application Postgres user name."
  value       = google_sql_user.app.name
}
