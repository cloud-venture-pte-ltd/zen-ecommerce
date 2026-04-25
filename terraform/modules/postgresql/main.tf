resource "azurerm_postgresql_flexible_server" "main" {
    name                   = "zen-postgres-${var.environment}"
    resource_group_name    = var.resource_group_name
    location               = var.location
    version                = "15"
    administrator_login    = var.db_admin_username
    administrator_password = var.db_admin_password
    storage_mb             = 32768
    sku_name               = "B_Standard_B1ms"
    backup_retention_days  = 7
    zone                   = "1"
}

resource "azurerm_postgresql_flexible_server_database" "main" {
    name      = "zen_db"
    server_id = azurerm_postgresql_flexible_server.main.id
    collation = "en_US.utf8"
    charset   = "utf8"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure" {
    name             = "allow-azure-services"
    server_id        = azurerm_postgresql_flexible_server.main.id
    start_ip_address = "0.0.0.0"
    end_ip_address   = "0.0.0.0"
}