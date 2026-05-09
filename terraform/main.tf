module "postgresql" {
    source              = "./modules/postgresql"
    environment         = var.environment
    location            = var.location
    resource_group_name = var.resource_group_name
    db_admin_username   = var.db_admin_username
    db_admin_password   = var.db_admin_password
}

module "keyvault" {
    source              = "./modules/keyvault"
    environment         = var.environment
    location            = var.location
    resource_group_name = var.resource_group_name
    database_url        = module.postgresql.database_url
}

module "blob_storage" {
    source              = "./modules/blob-storage"
    environment         = var.environment
    location            = var.location
    resource_group_name = var.resource_group_name
}

module "monitoring" {
    source              = "./modules/monitoring"
    environment         = var.environment
    location            = var.location
    resource_group_name = var.resource_group_name
}
module "container_apps" {
    source              = "./modules/container-apps"
    environment         = var.environment
    location            = var.location
    resource_group_name = var.resource_group_name
    acr_login_server    = var.acr_login_server
    backend_image       = var.backend_image
    frontend_image      = var.frontend_image
    database_url        = module.postgresql.database_url
    acr_username        = var.acr_username
    acr_password        = var.acr_password
    appinsights_connection_string = module.monitoring.connection_string
}