# ConvoLens Infrastructure

Azure infrastructure as code for ConvoLens, managed with **Terraform** (AzureRM provider).

> Migrated from Bicep on 2026-05-11. Naming follows the NL Azure Naming
> Standard with [ADR-0027](https://github.com/JustAGhosT/mystira-workspace/blob/main/docs/architecture/adr/0027-azure-resource-naming-convention.md)
> (no region suffix): `{org}-{env}-{project}-{type}` →
> `nl-dev-convolens-rg`, `nl-dev-convolens-kv`, etc.

## Layout

```
infra/
├── terraform/
│   ├── env/
│   │   └── dev/
│   │       ├── terraform.tf      # Provider versions + remote backend
│   │       ├── main.tf           # All resources (RG, KV, Storage, Cosmos, ACA, SWA, …)
│   │       ├── variables.tf      # Input variables
│   │       ├── outputs.tf        # Output values (endpoints, names, deploy tokens)
│   │       ├── backend.hcl       # Backend init args (state location)
│   │       └── terraform.tfvars  # Dev values (auto-loaded by Terraform)
│   └── .gitignore                # .terraform/, *.tfstate, etc.
├── scripts/                      # (empty — legacy bicep scripts removed)
└── README.md                     # This file
```

## Resources provisioned

The `dev` environment ships these by default (toggle via `enable_*` variables):

| Resource | Name | Notes |
|---|---|---|
| Resource Group | `nl-dev-convolens-rg` | All resources scoped to this RG |
| Log Analytics workspace | `nl-dev-convolens-law` | 30-day retention (90 in prod) |
| Application Insights | `nl-dev-convolens-appi` | Linked to LAW |
| Storage Account | `nldevconvolensst` | LRS, hot tier, blob soft-delete 7 days |
| Blob containers | `chat-exports`, `user-uploads`, `summaries` | Private access |
| Cosmos DB account | `nl-dev-convolens-cosmos` | Serverless, single region, no AZ redundancy |
| Cosmos SQL DB | `convolens` | 3 containers: `users` `/id`, `chats` `/userId`, `summaries` `/chatId` |
| Key Vault | `nl-dev-convolens-kv` | Access-policy mode, soft-delete 7 days |
| Container Apps Environment | `nl-dev-convolens-cae` | Consumption profile only |
| Container App | `nl-dev-convolens-api` | Placeholder helloworld image; the API CD workflow overrides `container_image_api` |
| Static Web App | `nl-dev-convolens-swa` | Free tier |
| KV secrets | `cosmos-db-endpoint`, `cosmos-db-key`, `cosmos-db-connection-string`, `storage-connection-string`, `appinsights-connection-string` | Created by Terraform after the deployer access policy lands |

Off by default in dev (set the variable to enable):

| Variable | Resource |
|---|---|
| `enable_redis = true` | Azure Cache for Redis Basic C0 (~$15-30/mo) |
| `enable_openai = true` | Azure OpenAI account (Foundry is configured separately today) |
| `enable_budget_alerts = true` + non-empty `admin_email` | RG-scoped consumption budget with 80% actual / 100% forecasted alerts |

## Remote state

Terraform state lives in Azure Storage. **Bootstrap once per workspace** (see `Bootstrap` below); never recreate by hand.

```
Storage account:    nltfstateconvolens
Resource group:     nl-tfstate-rg
Container:          tfstate
State key (dev):    convolens-dev.tfstate
```

Backend config is in `infra/terraform/env/dev/backend.hcl`. Passed to `init` via `-backend-config=backend.hcl`. The default `azurerm` backend uses access keys; local users and the GitHub Actions SP (`convolens-sp`) both need Contributor on the tfstate storage account, which their subscription-scoped Contributor already grants.

## Deploying

### Locally

```bash
cd infra/terraform/env/dev
terraform init -backend-config=backend.hcl
terraform plan
terraform apply
```

You need to be logged into Azure with permissions to manage `nl-dev-convolens-rg` and read `nl-tfstate-rg/nltfstateconvolens` keys.

### Via CI

The `Infrastructure` GitHub Actions workflow (`.github/workflows/infrastructure.yml`) runs:

- **Validate** — `terraform fmt -check` + `terraform validate` on every push and PR
- **Plan** — `terraform plan` with a posted PR comment on pull requests
- **Apply** — `terraform apply` on push to `main` (or `workflow_dispatch` → `apply`)
- **Verify** — health-checks the Container App URL after apply

Auth is OpenID Connect via the AAD app `convolens-sp` and the federated credential for `repo:neuralliquid/convolens:environment:dev`. The `AZURE_CREDENTIALS` env-scoped secret (env `dev`) provides `clientId`/`tenantId`/`subscriptionId` for the workflow.

## Bootstrap (new tenant / first time)

These steps were done for the active tenant (`9530cd32-9e33-47f0-9247-ed964730b580`, sub `bb4e3882-2079-4bab-8974-611bc0b8bb58`) on 2026-05-10. Keep here as a reference for future environments or tenant moves:

```bash
# 1. AAD app + service principal + federated cred
az ad app create --display-name convolens-sp
APP_OBJECT_ID=$(az ad app list --display-name convolens-sp --query '[0].id' -o tsv)
APP_CLIENT_ID=$(az ad app list --display-name convolens-sp --query '[0].appId' -o tsv)
az ad sp create --id "$APP_CLIENT_ID"
SP_OBJECT_ID=$(az ad sp list --display-name convolens-sp --query '[0].id' -o tsv)

az ad app federated-credential create --id "$APP_OBJECT_ID" --parameters '{
  "name": "github-actions-dev",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:neuralliquid/convolens:environment:dev",
  "audiences": ["api://AzureADTokenExchange"]
}'

# 2. Sub-scoped Contributor (lets the SP create RGs and provision resources)
az role assignment create \
  --assignee-object-id "$SP_OBJECT_ID" \
  --assignee-principal-type ServicePrincipal \
  --role Contributor \
  --scope /subscriptions/<sub-id>

# 3. Remote-state storage (one-time)
az group create --name nl-tfstate-rg --location eastus2
az storage account create \
  --name nltfstateconvolens \
  --resource-group nl-tfstate-rg \
  --location eastus2 \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false
SA_KEY=$(az storage account keys list --account-name nltfstateconvolens --resource-group nl-tfstate-rg --query "[0].value" -o tsv)
az storage container create --name tfstate --account-name nltfstateconvolens --account-key "$SA_KEY"

# 4. Set the env-scoped GitHub secret
gh secret set AZURE_CREDENTIALS --env dev --repo neuralliquid/convolens --body "$(jq -nc \
  --arg c "$APP_CLIENT_ID" \
  --arg t "<tenant-id>" \
  --arg s "<sub-id>" \
  '{clientId:$c, tenantId:$t, subscriptionId:$s}')"
```

## Adding staging or prod

1. Copy `infra/terraform/env/dev/` to `infra/terraform/env/{env}/`.
2. Update `terraform.tfvars` (env name, location, sizing flags, admin email).
3. Update `backend.hcl` → `key = "convolens-{env}.tfstate"`.
4. Create a federated credential matching `repo:neuralliquid/convolens:environment:{env}` on the AAD app.
5. Create the GitHub Environment `{env}` and set its `AZURE_CREDENTIALS` secret.
6. PR + merge — the workflow's `apply` job picks up the new environment.

## Cost (dev, today)

Rough monthly run-rate at idle:

- Cosmos DB serverless: $0 baseline; pay-per-request (RU-based). Empty DB ~free.
- Static Web App Free: $0.
- Storage Account LRS, hot tier, empty: <$1.
- App Insights + LAW: $0 until you ingest meaningful telemetry (per-GB pricing).
- Container Apps Consumption + 0 min replicas: $0 when idle.
- Key Vault Standard: ~$0.03 per 10k operations.

Expect <$5/mo at idle. The big drivers when active: Container Apps execution time, Cosmos RU consumption, and App Insights ingestion.

If you flip `enable_redis = true`, add ~$15-30/mo for Basic C0. `enable_openai = true` is metered separately by token usage.

## Drift / state recovery

If `terraform apply` errors mid-deploy and a resource exists in Azure but is missing from state:

```bash
cd infra/terraform/env/dev
MSYS_NO_PATHCONV=1 terraform import <resource_address> <azure_resource_id>
terraform apply
```

Common cause: transient ARM API hiccup between Azure responding and Terraform receiving the response. The resource shows up in `az resource list` but `terraform state list` is missing it. Import to recover.

## Removing the dev environment

```bash
cd infra/terraform/env/dev
terraform destroy
```

This tears down everything in `nl-dev-convolens-rg`. The Key Vault is soft-deleted (7-day window in dev); the provider's `purge_soft_delete_on_destroy = true` setting purges it cleanly.
