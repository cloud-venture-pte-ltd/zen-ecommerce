resource "azurerm_storage_account" "main" {
    name                     = "zenblob${var.environment}2026"
    resource_group_name      = var.resource_group_name
    location                 = var.location
    account_tier             = "Standard"
    account_replication_type = "LRS"
    allow_nested_items_to_be_public = true
}

resource "azurerm_storage_container" "images" {
    name                  = "product-images"
    storage_account_name  = azurerm_storage_account.main.name
    container_access_type = "blob"
}