variable "environment" {
    type = string
}

variable "location" {
    type = string
}

variable "resource_group_name" {
    type = string
}

variable "db_admin_username" {
    type = string
}

variable "db_admin_password" {
    type      = string
    sensitive = true
}