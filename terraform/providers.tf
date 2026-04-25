terraform {
    required_version = ">= 1.0"

    required_providers {
        azurerm = {
        source  = "hashicorp/azurerm"
        version = "~> 3.0"
        }
    } 

    backend "azurerm" {
        resource_group_name  = "zen-tfstate-rg"
        storage_account_name = "zentfstate2026"
        container_name       = "tfstate"
        key                  = "zen.terraform.tfstate"
    }
}

provider "azurerm" {
    features {}
}