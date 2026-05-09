variable "environment" {
    type = string
}

variable "location" {
    type = string
}

variable "resource_group_name" {
    type = string
}

variable "acr_login_server" {
    type = string
}

variable "backend_image" {
    type = string
}

variable "frontend_image" {
    type = string
}

variable "database_url" {
    type      = string
    sensitive = true
}

variable "acr_username" {
    type = string
}

variable "acr_password" {
    type      = string
    sensitive = true
}

variable "appinsights_connection_string" {}