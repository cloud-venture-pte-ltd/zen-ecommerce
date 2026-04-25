output "database_url" {
    value     = "postgresql://${var.db_admin_username}:${var.db_admin_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/zen_db"
    sensitive = true
}

output "server_fqdn" {
    value = azurerm_postgresql_flexible_server.main.fqdn
}