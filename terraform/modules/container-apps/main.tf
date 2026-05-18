resource "azurerm_log_analytics_workspace" "main" {
    name                = "zen-logs-${var.environment}"
    location            = var.location
    resource_group_name = var.resource_group_name
    sku                 = "PerGB2018"
    retention_in_days   = 30
}

resource "azurerm_container_app_environment" "main" {
    name                       = "zen-container-env-${var.environment}"
    location                   = var.location
    resource_group_name        = var.resource_group_name
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
    
}

resource "azurerm_container_app" "backend" {
    name                         = "zen-backend-${var.environment}"
    container_app_environment_id = azurerm_container_app_environment.main.id
    resource_group_name          = var.resource_group_name
    revision_mode                = "Single"

    secret {
        name  = "acr-password"
        value = var.acr_password
    }

    registry {
        server               = var.acr_login_server
        username             = var.acr_username
        password_secret_name = "acr-password"
    }

    template {
        container {
            name   = "backend"
            image  = var.backend_image
            cpu    = 0.5
            memory = "1Gi"

        env {
            name  = "DATABASE_URL"
            value = var.database_url
        }

        env {
            name  = "ADMIN_EMAIL"
            value = "admin@zen.com"
        }
        env {
            name  = "ADMIN_PASSWORD"
            value = "admin123"
        }
        env {
            name  = "SESSION_SECRET"
            value = "zen-session-secret-2026"
        }
        env {
            name  = "APP_NAME"
            value = "Zen E-Commerce"
        }
        env {
        name  = "APPLICATIONINSIGHTS_CONNECTION_STRING"
        value = var.appinsights_connection_string
        }
        }
    }

    ingress {
        external_enabled = true
        target_port      = 8000
        traffic_weight {
            percentage      = 100
            latest_revision = true
        }
    }
}

resource "azurerm_container_app" "frontend" {
    name                         = "zen-frontend-${var.environment}"
    container_app_environment_id = azurerm_container_app_environment.main.id
    resource_group_name          = var.resource_group_name
    revision_mode                = "Single"

    secret {
        name  = "acr-password"
        value = var.acr_password
    }

    registry {
        server               = var.acr_login_server
        username             = var.acr_username
        password_secret_name = "acr-password"
    }

    template {
        container {
        name   = "frontend"
        image  = var.frontend_image
        cpu    = 0.5
        memory = "1Gi"
        env {
            name  = "BACKEND_URL"
            value = "https://${azurerm_container_app.backend.ingress[0].fqdn}"
            }
        }
    }

    ingress {
        external_enabled = true
        target_port      = 3000
        traffic_weight {
            percentage      = 100
            latest_revision = true
        }
    }
}

