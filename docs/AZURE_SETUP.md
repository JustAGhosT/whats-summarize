# Azure Credentials Setup Guide

This guide explains how to set up Azure credentials for deploying WhatsSummarize infrastructure using GitHub Actions.

## Overview

WhatsSummarize uses **OpenID Connect (OIDC)** authentication to securely deploy to Azure without storing long-lived credentials. This is the recommended approach by both GitHub and Microsoft.

## Prerequisites

- An Azure subscription with Contributor access
- Azure CLI installed (`az --version` to verify)
- Owner or User Access Administrator role in Azure AD (for creating service principals)
- GitHub repository admin access (for configuring secrets)

## Step 1: Create Azure AD Application (Service Principal)

### Using Azure Portal

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Go to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Enter application details:
   - **Name**: `whatssummarize-github-actions`
   - **Supported account types**: Single tenant
   - Click **Register**

5. Note down these values (you'll need them later):
   - **Application (client) ID** → This is your `AZURE_CLIENT_ID`
   - **Directory (tenant) ID** → This is your `AZURE_TENANT_ID`

### Using Azure CLI

```bash
# Login to Azure
az login

# Set your subscription
az account set --subscription "<your-subscription-id>"

# Create service principal with Contributor role
az ad sp create-for-rbac \
  --name "whatssummarize-github-actions" \
  --role contributor \
  --scopes /subscriptions/<your-subscription-id>

# Note: This creates the service principal but we won't use client secrets.
# We'll configure OIDC (federated credentials) in the next step instead.
```

## Step 2: Configure Federated Credentials (OIDC)

OIDC allows GitHub Actions to authenticate to Azure without storing secrets.

### Using Azure Portal

1. Go to your App registration → **Certificates & secrets**
2. Click **Federated credentials** tab
3. Click **Add credential**
4. Select **GitHub Actions deploying Azure resources**
5. Fill in the details:
   - **Organization**: Your GitHub username or organization
   - **Repository**: `whatssummarize`
   - **Entity type**: Choose one:
     - **Branch** (for main branch deployments): `main`
     - **Pull Request** (for PR validation)
     - **Environment** (for specific environments): `dev`, `staging`, or `prod`
   - **Name**: Descriptive name like `github-actions-main`

6. Repeat for each scenario you want to support:
   - One for `main` branch
   - One for pull requests
   - One for each environment (dev, staging, prod)

### Using Azure CLI

```bash
# Get your subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Get the application ID (from step 1)
APP_ID="<your-application-client-id>"

# Replace with your GitHub username or organization
GITHUB_ORG="<your-github-username-or-org>"
GITHUB_REPO="whatssummarize"

# For main branch deployments
az ad app federated-credential create \
  --id $APP_ID \
  --parameters "{
    \"name\": \"github-actions-main\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:${GITHUB_ORG}/${GITHUB_REPO}:ref:refs/heads/main\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }"

# For pull requests
az ad app federated-credential create \
  --id $APP_ID \
  --parameters "{
    \"name\": \"github-actions-pr\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:${GITHUB_ORG}/${GITHUB_REPO}:pull_request\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }"

# For dev environment
az ad app federated-credential create \
  --id $APP_ID \
  --parameters "{
    \"name\": \"github-actions-dev\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:${GITHUB_ORG}/${GITHUB_REPO}:environment:dev\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }"

# For staging environment
az ad app federated-credential create \
  --id $APP_ID \
  --parameters "{
    \"name\": \"github-actions-staging\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:${GITHUB_ORG}/${GITHUB_REPO}:environment:staging\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }"

# For prod environment
az ad app federated-credential create \
  --id $APP_ID \
  --parameters "{
    \"name\": \"github-actions-prod\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:${GITHUB_ORG}/${GITHUB_REPO}:environment:prod\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }"
```

## Step 3: Assign Azure Permissions

The service principal needs appropriate permissions to deploy resources.

```bash
# Get your subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Assign Contributor role at subscription level
az role assignment create \
  --assignee <application-client-id> \
  --role "Contributor" \
  --scope /subscriptions/$SUBSCRIPTION_ID

# Optional: Assign at resource group level for more restricted access
# az role assignment create \
#   --assignee <application-client-id> \
#   --role "Contributor" \
#   --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-whatssummarize-dev
```

For specific resource operations, you may need additional roles:
- **Cognitive Services Contributor**: For Azure OpenAI
- **Key Vault Administrator**: For managing secrets
- **Storage Account Contributor**: For storage operations

## Step 4: Configure GitHub Repository Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

### Required Secrets

Choose one of the following options:

**Option A: Individual Secrets (Preferred for New Setups)**

Best for new repository setups as it provides better visibility and security:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AZURE_CLIENT_ID` | `<application-client-id>` | The Application (client) ID from Step 1 |
| `AZURE_TENANT_ID` | `<directory-tenant-id>` | The Directory (tenant) ID from Step 1 |
| `AZURE_SUBSCRIPTION_ID` | `<subscription-id>` | Your Azure subscription ID |

**Option B: JSON Secret (Currently Implemented)**

Use this option if you already have an `AZURE_CREDENTIALS` secret configured:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AZURE_CREDENTIALS` | `{"clientId":"...","tenantId":"...","subscriptionId":"..."}` | JSON containing all credentials |

The workflows will automatically parse the JSON to extract the individual values, with validation to ensure all required fields are present.

### How to Get These Values

```bash
# Get your subscription ID
az account show --query id -o tsv

# Get your tenant ID
az account show --query tenantId -o tsv

# Get your application (client) ID - from the app registration
# Check in Azure Portal → Azure AD → App registrations → Your app
```

## Step 5: Configure GitHub Environments (Optional but Recommended)

For better control and approval workflows:

1. Go to **Settings** → **Environments**
2. Create environments: `dev`, `staging`, `prod`
3. For `prod`, configure:
   - **Required reviewers**: Add team members who must approve
   - **Wait timer**: Optional delay before deployment
   - **Deployment branches**: Limit to `main` branch

4. Add environment-specific secrets if needed (overrides repository secrets)

## Step 6: Verify Configuration

### Test OIDC Authentication

Create a simple workflow to test authentication:

```yaml
name: Test Azure OIDC
on: workflow_dispatch

permissions:
  id-token: write
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Azure Login
        uses: azure/login@v1
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      
      - name: Verify Login
        run: |
          az account show
          echo "✅ Successfully authenticated to Azure!"
```

### Verify Permissions

Test that the service principal has the correct permissions:

```bash
# Login using Azure CLI (not service principal)
az login

# List role assignments for the service principal
az role assignment list --assignee <client-id>

# Create a test resource group to verify permissions
az group create \
  --name rg-test-permissions \
  --location eastus

# Clean up test resource group
az group delete --name rg-test-permissions --yes

# Note: The GitHub Actions workflow will use OIDC to authenticate automatically.
# You don't need to authenticate with client secrets.
```

## Troubleshooting

### Error: "No subscription found"

**Cause**: Service principal doesn't have access to the subscription.

**Solution**: Assign Contributor role (see Step 3)

### Error: "AADSTS700016: Application not found"

**Cause**: Incorrect `AZURE_CLIENT_ID` or app not created.

**Solution**: Verify the client ID in Azure Portal → App registrations

### Error: "The client with object id does not have authorization"

**Cause**: Missing role assignments.

**Solution**: 
```bash
az role assignment create \
  --assignee <client-id> \
  --role "Contributor" \
  --scope /subscriptions/<subscription-id>
```

### Error: "Federated credential: token exchange failed"

**Cause**: Incorrect federated credential configuration.

**Solution**: Verify the subject claim matches your repo/branch/environment exactly.

The subject format is: `repo:<GITHUB_ORG>/<GITHUB_REPO>:<entity_type>`

Examples:
- For main: `repo:<your-github-username-or-org>/whatssummarize:ref:refs/heads/main`
- For PR: `repo:<your-github-username-or-org>/whatssummarize:pull_request`
- For env: `repo:<your-github-username-or-org>/whatssummarize:environment:dev`

### Workflow Fails with "Login failed" or "Not all values are present"

**Common causes:**
1. Secrets not configured correctly
2. Missing `id-token: write` permission in workflow
3. Federated credentials not set up for the correct branch/environment
4. Malformed `AZURE_CREDENTIALS` JSON if using that option

**Debug steps:**
```yaml
- name: Debug Secrets (for individual secrets)
  run: |
    echo "Client ID length: ${#AZURE_CLIENT_ID}"
    echo "Tenant ID length: ${#AZURE_TENANT_ID}"
    echo "Subscription ID length: ${#AZURE_SUBSCRIPTION_ID}"
  env:
    AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
    AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
    AZURE_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

- name: Debug Secrets (for JSON secret)
  run: |
    echo "Parsing AZURE_CREDENTIALS..."
    CLIENT_ID=$(echo '${{ secrets.AZURE_CREDENTIALS }}' | jq -r '.clientId')
    TENANT_ID=$(echo '${{ secrets.AZURE_CREDENTIALS }}' | jq -r '.tenantId')
    SUBSCRIPTION_ID=$(echo '${{ secrets.AZURE_CREDENTIALS }}' | jq -r '.subscriptionId')
    echo "Client ID length: ${#CLIENT_ID}"
    echo "Tenant ID length: ${#TENANT_ID}"
    echo "Subscription ID length: ${#SUBSCRIPTION_ID}"
```

**Verify JSON format:**
If using `AZURE_CREDENTIALS`, ensure the JSON is valid:
```bash
# Test locally
echo '{"clientId":"xxx","tenantId":"yyy","subscriptionId":"zzz"}' | jq .
```

## Security Best Practices

1. **Use OIDC instead of service principal secrets**
   - No long-lived credentials stored in GitHub
   - Tokens are short-lived and automatically rotated

2. **Principle of Least Privilege**
   - Grant only necessary permissions
   - Use resource group scope instead of subscription when possible

3. **Environment Protection**
   - Require approval for production deployments
   - Limit deployment branches
   - Use environment-specific service principals

4. **Regular Audits**
   - Review federated credentials quarterly
   - Check role assignments regularly
   - Monitor Azure Activity Logs for suspicious activity

5. **Credential Rotation**
   - OIDC tokens rotate automatically
   - If using client secrets (not recommended), rotate every 90 days

## Additional Resources

- [Azure OIDC Documentation](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure)
- [GitHub Actions Azure Login](https://github.com/marketplace/actions/azure-login)
- [Azure CLI Reference](https://learn.microsoft.com/en-us/cli/azure/)
- [WhatsSummarize Infrastructure Guide](../infra/README.md)

## Quick Reference Commands

```bash
# Get subscription info
az account show

# List role assignments for service principal
az role assignment list --assignee <client-id>

# List federated credentials
az ad app federated-credential list --id <app-id>

# Test deployment (dry run) — Terraform
terraform -chdir=infra/terraform/env/dev init -backend-config=backend.hcl
terraform -chdir=infra/terraform/env/dev plan
```

## Migration from Legacy Credentials

If you previously used `AZURE_CREDENTIALS` JSON secret:

### Option 1: Use OIDC (Recommended)

1. Delete the old `AZURE_CREDENTIALS` secret
2. Follow steps 1-4 above to configure OIDC
3. Update workflows to use the new authentication method (already done in this repo)
4. Test thoroughly in dev environment before deploying to production

### Option 2: Parse JSON Secret (Current Implementation)

If you need to keep using the `AZURE_CREDENTIALS` JSON secret format, the workflows automatically parse it to extract the required values:

1. Create an `AZURE_CREDENTIALS` secret with the following JSON format:
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionId": "...",
  "tenantId": "...",
  "resourceManagerEndpointUrl": "https://management.azure.com"
}
```

2. The workflow will automatically extract:
   - `clientId` → used as `client-id`
   - `tenantId` → used as `tenant-id`
   - `subscriptionId` → used as `subscription-id`

3. This approach is compatible with OIDC authentication when the service principal has federated credentials configured

**Note**: Using individual secrets (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`) is preferred for better security and visibility, but the JSON format is supported for backward compatibility.
