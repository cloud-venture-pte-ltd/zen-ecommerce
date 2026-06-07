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

## Bug #5 — Docker Compose Build Context Error
Date: 2026-04-27 | Owner: Local Testing Session
What broke: Frontend container failed to build - path not found
What we tried: Checked directory structure, found frontend code in ./backend not ./src/frontend
Root cause: docker-compose.yml had `context: ./src/frontend` but actual code was in `./backend`
Fix: Updated docker-compose.yml: `context: ./backend`
How to prevent: Verify build context paths match actual directory structure

---

## Bug #6 — CORS Errors from Direct API Calls
Date: 2026-04-27 | Owner: Local Testing Session
What broke: Browser blocked all API requests with CORS policy errors
What we tried: Initially considered adding CORS headers to backend, then realized frontend was calling wrong URL
Root cause: Frontend was making direct requests to `http://localhost:8000/api/*` instead of relative `/api/*`
Fix: 
  1. Removed NEXT_PUBLIC_API_URL from docker-compose.yml (set to empty)
  2. Updated all frontend pages to use relative `/api/*` URLs
  3. Next.js rewrites proxy requests to backend
How to prevent: Always use relative URLs for same-origin API calls in Next.js apps

---

## Bug #7 — Missing API Endpoints (404 Errors)
Date: 2026-04-27 | Owner: Local Testing Session
What broke: Multiple 404 errors for /api/products, /api/orders, /api/login, /api/checkout, etc.
What we tried: Checked backend routes, found only HTML template routes existed
Root cause: Backend only had HTML routes, missing JSON API endpoints required by frontend
Fix: Added all missing API endpoints to src/backend/app/main.py:
  - Product APIs (list, detail)
  - Order APIs (list, detail)
  - Auth APIs (register, login)
  - Admin APIs (products CRUD, orders, seed-admin)
  - Checkout API
How to prevent: Ensure API contract is defined before implementing frontend

---

## Bug #8 — Admin Dashboard Empty
Date: 2026-04-27 | Owner: Local Testing Session
What broke: Admin dashboard showed no products or orders after login
What we tried: Checked browser console, found 404 errors for /api/admin/products and /api/admin/orders
Root cause: Missing admin API endpoints (same as Bug #7)
Fix: Added /api/admin/products and /api/admin/orders endpoints to backend
How to prevent: Test all user roles during development

---

## Bug #9 — Checkout 422 Validation Error
Date: 2026-04-27 | Owner: Local Testing Session
What broke: Checkout form submission failed with 422 Unprocessable Entity
What we tried: Checked form data being sent, compared with backend requirements
Root cause: Form was missing `payment_method` field which backend required as mandatory
Fix: Added hidden input field to checkout form: `<input type="hidden" name="payment_method" value="Card" />`
How to prevent: Ensure form fields match backend API requirements exactly

---

## Bug #10 — Duplicate /api Prefix in API Calls
Date: 2026-04-27 | Owner: Local Testing Session
What broke: Some API calls failed with 404, URL showed /api/api/products
What we tried: Checked api.ts baseURL and services.ts endpoints
Root cause: services.ts had '/api/products' while api.ts baseURL already included '/api'
Fix: Removed '/api' prefix from all endpoints in services.ts
How to prevent: Keep API path configuration in one place only

---

## Bug #11 — Admin Add Product Form Reset Error
Date: 2026-04-27 | Owner: Local Testing Session
What broke: "Cannot read properties of null (reading 'reset')" when adding product in admin
What we tried: Checked form submission handler in admin page
Root cause: `e.currentTarget.reset()` called without checking if form element exists
Fix: Added null check before calling reset():
  ```typescript
  const form = e.currentTarget
  if (form && form.reset) {
    form.reset()
  }
  ```
How to prevent: Always check DOM element existence before calling methods

---

## Bug #12 — Product Images Not Saving in Admin
Date: 2026-04-27 | Owner: Local Testing Session
What broke: Product images not saved when adding/updating products in admin dashboard
What we tried: Checked frontend form submission, then checked backend API parameters
Root cause: Backend API endpoints (`/api/admin/products` and `/api/admin/products/{id}/update`) were not accepting the `image_url` parameter
Fix: Added `image_url: str = Form(None)` parameter to both endpoints in src/backend/app/main.py:
  - api_admin_create_product now accepts and saves image_url
  - api_admin_update_product now accepts and updates image_url
How to prevent: Ensure all form fields have corresponding API parameters

---

## Bug #13 — Frontend 500 Error: Failed to Load Products
Date: 2026-05-18 | Owner: Spencer (DevOps)
What broke: Frontend showing "Failed to load products: Request failed with status code 500"
Root cause: Terraform renamed BACKEND_URL to NEXT_PUBLIC_API_URL. NEXT_PUBLIC_API_URL
            is baked into the Docker image at build time — not available at runtime
            on Azure Container Apps. BACKEND_URL is the correct variable.
Fix: Reverted env var back to BACKEND_URL in container-apps/main.tf
     Ran terraform apply to update the frontend container
How to prevent: Never rename BACKEND_URL to NEXT_PUBLIC_API_URL in Terraform

## Bug #14 — Infrastructure Deleted by Teammate
Date: 2026-06-07 | Owner: Spencer (DevOps)
What broke: All Azure resources deleted — Container Apps, PostgreSQL, 
            Key Vault, ACR, Blob Storage, Terraform state
Root cause: Teammate deleted resource groups without checking contents
Fix: Full infrastructure rebuild via Terraform
     New Container Apps environment: orangefield-15619624
     Delete lock added to zen-tfstate-rg to prevent repeat
How to prevent: Add CanNotDelete lock to all critical resource groups
                Never delete RGs without team confirmation on Teams

## Bug #15 — Backend Dockerfile Overwritten with Frontend Content
Date: 2026-06-07 | Owner: Spencer (DevOps)
What broke: docker compose up failed — backend trying to run npm install
Root cause: src/backend/Dockerfile accidentally replaced with 
            src/frontend/Dockerfile content during Dockerfile changes
Fix: Restored correct Python/FastAPI Dockerfile for backend
How to prevent: Always check both Dockerfiles after any Dockerfile changes
                Test with docker compose up --build locally before pushing

## Bug #16 — Frontend 500 Error After Infrastructure Rebuild
Date: 2026-06-07 | Owner: Spencer (DevOps)
What broke: Frontend showing 500 error — products not loading on Azure
Root cause: Next.js rewrites in next.config.js are evaluated at BUILD TIME
            not runtime. BACKEND_URL env var on Container Apps is ignored
            by the rewrite. Must be passed as Docker build arg.
            Additionally, "Set environment name" step in deploy.yml was
            positioned AFTER build steps, so BACKEND_URL build arg 
            resolved to empty string during the build.
Fix: Added ARG BACKEND_URL to Dockerfile before RUN npm run build
     Passed --build-arg BACKEND_URL in deploy.yml docker build command
     Moved "Set environment name" step before build steps in deploy.yml
     Changed lib/api.ts to use BACKEND_URL instead of NEXT_PUBLIC_API_URL
How to prevent: Next.js config values are build-time only
                Always pass backend URL as build arg, never runtime env
                Set environment variables before any step that uses them