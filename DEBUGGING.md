# DEBUGGING.md
# Real bugs only — not practice mistakes
# Format: what broke → what tried → root cause → fix → prevent

---

## Bug #1 — Duplicate checkout_post function
Date: 2026-04-24 | Owner: Spencer
What broke: Backend failed to start with IndentationError on line 529
What we tried: remove duplicate function line by line
Root cause: checkout_post defined twice in main.py, causing IndentationError
Fix: manually deleted orphaned lines until file was clean
How to prevent: check for duplicate function definitions

---

## Bug #2 — azurerm_storage_container deprecated attribute
Date: 2026-04-25 | Owner: Spencer
What broke: VS Code shows deprecation warning on storage_account_name in terraform/modules/blob-storage/main.tf
What we tried: N/A — resource deploys correctly despite warning
Root cause: azurerm provider ~3.0 deprecated storage_account_name in favour of storage_account_id
Fix when ready: change to: storage_account_id = azurerm_storage_account.main.id then run terraform apply to update state
How to prevent: pin provider to exact version, check deprecation notes before upgrading

---

## Bug #3 — Azure provider namespaces not registered
Date: 2026-04-25 | Owner: Spencer
What broke: terraform apply failed with MissingSubscriptionRegistration for Microsoft.App, Microsoft.Storage, Microsoft.ContainerRegistry
What we tried: re-running apply, re-logging in to Azure CLI
Root cause: new Azure student subscription does not auto-register resource providers — must be registered manually first
Fix: az provider register --namespace Microsoft.App
     az provider register --namespace Microsoft.Storage
     az provider register --namespace Microsoft.ContainerRegistry
     az provider register --namespace Microsoft.OperationalInsights
     az provider register --namespace Microsoft.KeyVault
     az provider register --namespace Microsoft.DBforPostgreSQL
     Wait for "Registered" status before running terraform apply
How to prevent: always register all required providers beforerunning terraform init on a new subscription

---

## Bug #4 — Container App failed with empty ACR
Date: 2026-04-25 | Owner: Spencer
What broke: terraform apply failed with MANIFEST_UNKNOWN — backend:latest not found in ACR
What we tried: re-running apply with different image tags
Root cause: Terraform tried to deploy Container App pointing at zenecr2026.azurecr.io/backend:latest but ACR was empty — no images had been pushed yet
Fix: use Microsoft public placeholder image in tfvars until pipeline pushes the real image:
     backend_image = "mcr.microsoft.com/azuredocs/ containerapps-helloworld:latest" Then pipeline replaces it with real SHA-tagged image on first push
How to prevent: always push a real image to ACR before running terraform apply for Container Apps Or use placeholder image in initial tfvars by default

---

## Bug #5 — ACR credentials missing from Container App Terraform config
Date: 2026-04-25 | Owner: Spencer
What broke: terraform apply failed with "must supply either identity or username/password_secret_name" for Container App registry
What we tried: adding acr_password directly as attribute (wrong syntax)
Root cause: Container Apps requires a secret block to store the ACR password, then reference it by name in the registry block
Fix: add secret block before registry block in container app resource:
     secret {
       name  = "acr-password"
       value = var.acr_password
     }
     registry {
       server               = var.acr_login_server
       username             = var.acr_username
       password_secret_name = "acr-password"
     }
How to prevent: always check azurerm_container_app docs for registry authentication requirements before writing the resource