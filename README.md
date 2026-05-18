# zen-ecommerce

Cloud-native e-commerce platform for Zen Pte Ltd built on Azure.
Team: Cloud Venture 

## What this is

An electronics e-commerce platform with a FastAPI backend,
Next.js frontend, and full CI/CD pipeline deploying to Azure
Container Apps via GitHub Actions and Terraform.

## Prerequisites

- Docker Desktop
- Node.js 20 LTS
- Python 3.12
- Azure CLI
- Terraform 1.0+
- Git

## Run locally

```bash
git clone https://github.com/cloud-venture-pte-ltd/zen-ecommerce.gitcd zen-ecommerce 
cp .env.example .env
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > src/frontend/.env.local
docker compose up --build
```

Test health endpoints:
```bash
curl http://localhost:8000/health   # {"status":"ok"}
curl http://localhost:8000/ready    # {"status":"ready"}
curl http://localhost:3000/api/health  # {"status":"ok"}
```

## Live environments

| Environment | Backend | Frontend |
|-------------|---------|----------|
| dev | https://zen-backend-dev.nicemushroom-f0157107.southeastasia.azurecontainerapps.io | https://zen-frontend-dev.nicemushroom-f0157107.southeastasia.azurecontainerapps.io |

## Deploy

Push to a feature branch → open PR to dev → pipeline runs lint →
merge → pipeline builds Docker images → pushes to ACR with SHA tag →
deploys to Container Apps automatically.

## Team

| Name | Role | Branch |
|------|------|--------|
| Spencer | DevOps lead | feat/infra, feat/devops |
| Sarah | DevOps 2 | feat/infra, feat/devops |
| Zaid | Backend lead | feat/backend |
| Lan Tao | Frontend + assist | feat/backend |

## Repo structure

```
src/backend/    FastAPI backend
src/frontend/   Next.js frontend
terraform/      Azure infrastructure as code
.github/        CI/CD pipeline and repo config
```
