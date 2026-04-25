output "storage_account_name" {
    value = azurerm_storage_account.main.name
}

output "primary_blob_endpoint" {
    value = azurerm_storage_account.main.primary_blob_endpoint
}

output "images_container_name" {
    value = azurerm_storage_container.images.name
}