output "frontend_url" {
    value = module.container_apps.frontend_url
}

output "backend_url" {
    value = module.container_apps.backend_url
}

output "blob_endpoint" {
    value = module.blob_storage.primary_blob_endpoint
}

output "key_vault_uri" {
    value = module.keyvault.key_vault_uri
}

