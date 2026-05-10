# ConvoLens Infrastructure

Azure infrastructure as code using Bicep templates for ConvoLens.

> **Note:** Azure resource names (e.g. `rg-whatssummarize-*`, `kvwhatssummarizedev`,
> `cosmos-whatssummarize-dev`, `oai-whatssummarize-dev`) intentionally still
> reference the legacy project name — renaming live Azure resources is a
> separate, user-driven decision tracked in PR4 / cross-repo follow-ups.

## Overview

This directory contains all infrastructure configuration for deploying ConvoLens to Azure:

```
infra/
├── bicep/
│   ├── main.bicep              # Main orchestration template
│   └── modules/
│       ├── key-vault.bicep     # Azure Key Vault
│       ├── storage.bicep       # Azure Blob Storage
│       ├── openai.bicep        # Azure OpenAI Service
│       ├── cosmos-db.bicep     # Azure Cosmos DB
│       ├── redis.bicep         # Azure Redis Cache
│       ├── app-insights.bicep  # Application Insights
│       ├── container-apps.bicep# Azure Container Apps
│       └── static-web-app.bicep# Azure Static Web Apps
├── parameters/
│   ├── dev.bicepparam          # Development environment
│   ├── staging.bicepparam      # Staging environment (create as needed)
│   └── prod.bicepparam         # Production environment
└── scripts/
    ├── deploy.ps1              # PowerShell deployment (recommended)
    ├── deploy.sh               # Bash deployment script
    ├── validate-resources.ps1  # PowerShell validation
    └── validate-resources.sh   # Bash validation script
```

## Azure Resources

| Resource | Purpose | Required |
|----------|---------|----------|
| Resource Group | Container for all resources | Yes |
| Key Vault | Secrets management | Yes |
| Storage Account | Blob storage for exports | Yes |
| Azure OpenAI | AI summarization | No* |
| Cosmos DB | NoSQL database | No* |
| Redis Cache | Distributed caching | No* |
| Application Insights | Monitoring & logging | Yes |
| Container Apps | API hosting | Yes |
| Static Web Apps | Frontend hosting | Yes |

*Optional but recommended for production.

## Prerequisites

1. **Azure CLI** installed and logged in
   ```bash
   az login
   az account set --subscription "<subscription-id>"
   ```

2. **Bicep CLI** (usually included with Azure CLI)
   ```bash
   az bicep install
   az bicep version
   ```

3. **Required permissions**:
   - Contributor access to the subscription/resource group
   - Key Vault Administrator (for managing secrets)
   - Cognitive Services Contributor (for OpenAI)

4. **GitHub Actions Setup** (for CI/CD deployments):
   - See [Azure Setup Guide](../docs/AZURE_SETUP.md) for configuring OIDC authentication
   - Requires configuring three GitHub secrets: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`

## Quick Start

### Deploy Development Environment (PowerShell - Recommended)

```powershell
# From repository root
cd infra/scripts

# Deploy (what-if runs automatically first, then prompts for confirmation)
./deploy.ps1 -Environment dev

# Skip what-if and deploy directly
./deploy.ps1 -Environment dev -SkipWhatIf -Force

# Only run what-if analysis
./deploy.ps1 -Environment dev -WhatIfOnly

# Validate templates only
./deploy.ps1 -Environment dev -ValidateOnly
```

### Deploy Production Environment

```powershell
# Deploy to production (what-if + confirmation by default)
./deploy.ps1 -Environment prod

# Preview production changes only
./deploy.ps1 -Environment prod -WhatIfOnly
```

### Bash Alternative

```bash
./deploy.sh dev                    # Deploy to dev
./deploy.sh prod --what-if         # Preview production changes
./deploy.sh staging --validate-only # Validate staging templates
```

## Deployment Options

### Using Scripts (Recommended)

```powershell
# PowerShell (what-if is automatic)
./scripts/deploy.ps1 -Environment <env>              # Full deploy with what-if
./scripts/deploy.ps1 -Environment <env> -WhatIfOnly  # Preview only
./scripts/deploy.ps1 -Environment <env> -ValidateOnly # Validate templates
./scripts/validate-resources.ps1 -Environment <env>  # Validate resources
```

```bash
# Bash alternative
./scripts/deploy.sh <environment>                    # Deploy
./scripts/deploy.sh <environment> --what-if          # Preview
./scripts/deploy.sh <environment> --validate-only    # Validate
./scripts/validate-resources.sh <environment>        # Validate resources
```

### Using Azure CLI Directly

```bash
# Create resource group
az group create \
  --name rg-whatssummarize-dev \
  --location eastus

# Deploy
az deployment group create \
  --resource-group rg-whatssummarize-dev \
  --template-file bicep/main.bicep \
  --parameters parameters/dev.bicepparam
```

### Using GitHub Actions

1. **Configure Azure credentials** (see [Azure Setup Guide](../docs/AZURE_SETUP.md) for detailed instructions):
   - Create Azure AD application (service principal)
   - Configure federated credentials for OIDC
   - Set up GitHub repository secrets:
     - `AZURE_CLIENT_ID` - Service principal client ID
     - `AZURE_TENANT_ID` - Azure AD tenant ID
     - `AZURE_SUBSCRIPTION_ID` - Azure subscription ID

2. **Trigger deployment**:
   - Push to `main` branch (auto-deploys to dev)
   - Use workflow dispatch for staging/prod
   - PRs trigger what-if analysis

## Configuration

### Environment Parameters

Edit `parameters/<environment>.bicepparam` to customize:

```bicep
param environment = 'dev'
param projectName = 'whatssummarize'
param location = 'eastus'

// Enable/disable optional resources
param enableOpenAI = true
param enableCosmosDB = true
param enableRedis = true

// OpenAI model deployments
param openAIDeployments = [
  { name: 'gpt-4', model: 'gpt-4', version: '0613', capacity: 10 }
]
```

### Resource Naming Convention

Resources follow this naming pattern:
- `<type>-<project>-<environment>`

Examples:
- `rg-whatssummarize-dev` (Resource Group)
- `kvwhatssummarizedev` (Key Vault - no hyphens)
- `cosmos-whatssummarize-dev` (Cosmos DB)

## CI/CD Workflows

### Infrastructure Workflow

Triggered by:
- Push to `main` (auto-deploy to dev)
- Pull requests (what-if analysis)
- Manual dispatch (any environment)

### Release Validation

Runs before releases to verify:
- All required Azure resources exist
- Secrets are configured in Key Vault
- Application builds successfully
- Tests pass

## Post-Deployment

After deployment, the script generates `.env.azure` with:

```bash
# Azure Provider
AZURE_PROVIDER_ENABLED=true

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://oai-whatssummarize-dev.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4

# Azure Cosmos DB
AZURE_COSMOS_ENDPOINT=https://cosmos-whatssummarize-dev.documents.azure.com

# etc...
```

Secrets are stored in Key Vault and should be retrieved at runtime.

## Validation

Validate resources exist before release:

```bash
# Run validation script
./scripts/validate-resources.sh prod

# Or use strict mode (fails on any missing required resource)
./scripts/validate-resources.sh prod --strict
```

## Cost Optimization

### Development
- Uses serverless Cosmos DB
- Basic Redis tier
- Minimal OpenAI capacity

### Production
- Standard Redis tier
- Higher OpenAI capacity
- Zone redundancy recommended

### Cost Estimates (approximate)

| Environment | Monthly Cost |
|-------------|--------------|
| Dev | ~$50-100 |
| Staging | ~$100-200 |
| Production | ~$300-500+ |

*Costs vary based on usage. OpenAI costs scale with token usage.*

## Troubleshooting

### Deployment Fails

1. Check Azure CLI login:
   ```bash
   az account show
   ```

2. Validate templates:
   ```bash
   az bicep build --file bicep/main.bicep
   ```

3. Check resource quotas:
   ```bash
   az vm list-usage --location eastus
   ```

### OpenAI Not Available

Azure OpenAI has limited regional availability. Update `location` parameter if needed.

### Key Vault Access

Ensure your identity has Key Vault access:
```bash
az keyvault set-policy \
  --name kvwhatssummarizedev \
  --upn your@email.com \
  --secret-permissions get list set delete
```

## Security Considerations

- Secrets stored in Key Vault, never in code
- Managed identities for service-to-service auth
- HTTPS enforced everywhere
- Private endpoints available for production
- Regular key rotation recommended

## Related Documentation

- [Azure Bicep](https://docs.microsoft.com/azure/azure-resource-manager/bicep/)
- [Azure OpenAI](https://docs.microsoft.com/azure/cognitive-services/openai/)
- [Azure Container Apps](https://docs.microsoft.com/azure/container-apps/)
- [Azure Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/)
