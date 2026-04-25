output "backend_url" {
    value = "https://${azurerm_container_app.backend.ingress[0].fqdn}"
}

output "frontend_url" {
    value = "https://${azurerm_container_app.frontend.ingress[0].fqdn}"
}

output "container_app_environment_id" {
    value = azurerm_container_app_environment.main.id
}