data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "main" {
    name                = "zen-kv-${var.environment}"
    location            = var.location
    resource_group_name = var.resource_group_name
    tenant_id           = data.azurerm_client_config.current.tenant_id
    sku_name            = "standard"

    access_policy {
        tenant_id = data.azurerm_client_config.current.tenant_id
        object_id = data.azurerm_client_config.current.object_id

        secret_permissions = [
            "Get", "List", "Set", "Delete", "Purge"
        ]
    }
}

resource "azurerm_key_vault_secret" "database_url" {
    name         = "DATABASE-URL"
    value        = var.database_url
    key_vault_id = azurerm_key_vault.main.id
}