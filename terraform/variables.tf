variable "environment" {
    description = "Environment name (dev or prod)"
    type        = string
}

variable "location" {
    description = "Azure region"
    type        = string
    default     = "southeastasia"
}

variable "resource_group_name" {
    description = "Name of the resource group"
    type        = string
}

variable "acr_login_server" {
    description = "ACR login server URL"
    type        = string
    default     = "zenecr2026.azurecr.io"
}

variable "backend_image" {
    description = "Backend container image"
    type        = string
    default     = "zenecr2026.azurecr.io/backend:latest"
}

variable "frontend_image" {
    description = "Frontend container image"
    type        = string
    default     = "zenecr2026.azurecr.io/frontend:latest"
}

variable "db_admin_username" {
    description = "PostgreSQL admin username"
    type        = string
    default     = "zenadmin"
}

variable "db_admin_password" {
    description = "PostgreSQL admin password"
    type        = string
    sensitive   = true
}

variable "acr_username" {
    description = "ACR admin username"
    type        = string
}

variable "acr_password" {
    description = "ACR admin password"
    type        = string
    sensitive   = true
}