# =============================================================================
# Azure Infrastructure Deployment Script (PowerShell)
# =============================================================================
# Deploys or updates Azure infrastructure using Bicep templates.
# What-if analysis runs automatically before deployment unless skipped.
#
# Usage:
#   ./deploy.ps1 -Environment dev
#   ./deploy.ps1 -Environment prod -SkipWhatIf
#   ./deploy.ps1 -Environment dev -WhatIfOnly
#   ./deploy.ps1 -Environment dev -ValidateOnly
#
# =============================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment = 'dev',

    [Parameter(Mandatory = $false)]
    [switch]$SkipWhatIf,

    [Parameter(Mandatory = $false)]
    [switch]$WhatIfOnly,

    [Parameter(Mandatory = $false)]
    [switch]$ValidateOnly,

    [Parameter(Mandatory = $false)]
    [switch]$Force
)

# =============================================================================
# Configuration
# =============================================================================

$ErrorActionPreference = 'Stop'
$Org = 'nl'
$ProjectName = 'convolens'
$Location = 'eastus'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InfraDir = Split-Path -Parent $ScriptDir
$BicepDir = Join-Path $InfraDir 'bicep'
$ParamsDir = Join-Path $InfraDir 'parameters'

# Naming pattern per ADR-0027 (no region suffix): {org}-{env}-{project}-{type}
$Base = "$Org-$Environment-$ProjectName"
$BaseAlphanumeric = "$Org$Environment$ProjectName"
$ResourceGroup = "$Base-rg"

# =============================================================================
# Utility Functions
# =============================================================================

function Write-Info { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-SuccessMessage { param([string]$Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-WarningMessage { param([string]$Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-ErrorMessage { param([string]$Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# Helper for null coalescing (PowerShell 5.1 compatible)
function Get-ValueOrDefault {
    param($Value, $Default)
    if ($null -eq $Value -or $Value -eq '') { return $Default }
    return $Value
}

function Write-Banner {
    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Magenta
    Write-Host "  Azure Infrastructure Deployment" -ForegroundColor Magenta
    Write-Host "  Environment: $Environment" -ForegroundColor Magenta
    Write-Host "  Project: $ProjectName" -ForegroundColor Magenta
    Write-Host "==============================================" -ForegroundColor Magenta
    Write-Host ""
}

# =============================================================================
# Pre-flight Checks
# =============================================================================

function Test-Prerequisites {
    Write-Info "Running pre-flight checks..."

    # Check Azure CLI
    try {
        $null = az version 2>$null
    }
    catch {
        Write-ErrorMessage "Azure CLI not found. Please install: https://docs.microsoft.com/cli/azure/install-azure-cli"
        exit 1
    }

    # Check Bicep
    $bicepVersion = az bicep version 2>$null
    if (-not $bicepVersion) {
        Write-Info "Installing Bicep CLI..."
        az bicep install
    }

    # Check login
    $account = az account show 2>$null | ConvertFrom-Json
    if (-not $account) {
        Write-ErrorMessage "Not logged into Azure. Run: az login"
        exit 1
    }
    Write-Info "Logged in as: $($account.user.name)"
    Write-Info "Subscription: $($account.name)"

    # Check parameter file exists
    $paramFile = Join-Path $ParamsDir "$Environment.bicepparam"
    if (-not (Test-Path $paramFile)) {
        Write-ErrorMessage "Parameter file not found: $paramFile"
        exit 1
    }

    # Check main.bicep exists
    $mainBicep = Join-Path $BicepDir 'main.bicep'
    if (-not (Test-Path $mainBicep)) {
        Write-ErrorMessage "Main Bicep file not found: $mainBicep"
        exit 1
    }

    Write-SuccessMessage "Pre-flight checks passed"
}

# =============================================================================
# Validation
# =============================================================================

function Test-Templates {
    Write-Info "Validating Bicep templates..."

    $mainBicep = Join-Path $BicepDir 'main.bicep'
    $result = az bicep build --file $mainBicep --stdout 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMessage "Template validation failed"
        Write-Host $result
        exit 1
    }

    Write-SuccessMessage "Template validation passed"
}

# =============================================================================
# Resource Group
# =============================================================================

function Ensure-ResourceGroup {
    Write-Info "Ensuring resource group exists: $ResourceGroup"

    $exists = az group exists --name $ResourceGroup 2>$null
    if ($exists -eq 'true') {
        Write-Info "Resource group already exists"
    }
    else {
        Write-Info "Creating resource group..."
        az group create `
            --name $ResourceGroup `
            --location $Location `
            --tags project=$ProjectName environment=$Environment managedBy=bicep | Out-Null
        Write-SuccessMessage "Resource group created"
    }
}

# =============================================================================
# What-If Analysis
# =============================================================================

function Invoke-WhatIfAnalysis {
    param([string]$DeploymentName)

    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Yellow
    Write-Host "  WHAT-IF ANALYSIS" -ForegroundColor Yellow
    Write-Host "  Previewing changes before deployment..." -ForegroundColor Yellow
    Write-Host "==============================================" -ForegroundColor Yellow
    Write-Host ""

    $paramFile = Join-Path $ParamsDir "$Environment.bicepparam"
    $mainBicep = Join-Path $BicepDir 'main.bicep'

    az deployment group what-if `
        --resource-group $ResourceGroup `
        --template-file $mainBicep `
        --parameters $paramFile `
        --name $DeploymentName

    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMessage "What-if analysis failed"
        exit 1
    }

    Write-Host ""
    Write-SuccessMessage "What-if analysis complete"

    return $true
}

# =============================================================================
# Deployment
# =============================================================================

function Invoke-Deployment {
    param([string]$DeploymentName)

    $paramFile = Join-Path $ParamsDir "$Environment.bicepparam"
    $mainBicep = Join-Path $BicepDir 'main.bicep'

    if ($ValidateOnly) {
        Write-Info "Validating deployment (no changes will be made)..."
        az deployment group validate `
            --resource-group $ResourceGroup `
            --template-file $mainBicep `
            --parameters $paramFile `
            --name $DeploymentName

        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMessage "Deployment validation failed"
            exit 1
        }

        Write-SuccessMessage "Deployment validation passed"
        return
    }

    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Green
    Write-Host "  DEPLOYING INFRASTRUCTURE" -ForegroundColor Green
    Write-Host "==============================================" -ForegroundColor Green
    Write-Host ""

    Write-Info "Starting deployment: $DeploymentName"
    Write-Info "Environment: $Environment"
    Write-Info "Resource Group: $ResourceGroup"
    Write-Host ""

    az deployment group create `
        --resource-group $ResourceGroup `
        --template-file $mainBicep `
        --parameters $paramFile `
        --name $DeploymentName `
        --verbose

    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMessage "Deployment failed"
        exit 1
    }

    Write-Host ""
    Write-SuccessMessage "Deployment complete!"

    # Show outputs
    Write-Host ""
    Write-Info "Deployment Outputs:"
    az deployment group show `
        --resource-group $ResourceGroup `
        --name $DeploymentName `
        --query "properties.outputs" `
        -o json
}

# =============================================================================
# Confirmation Prompt
# =============================================================================

function Get-DeploymentConfirmation {
    if ($Force) {
        return $true
    }

    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host "  READY TO DEPLOY" -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Environment: " -NoNewline; Write-Host $Environment -ForegroundColor Yellow
    Write-Host "Resource Group: " -NoNewline; Write-Host $ResourceGroup -ForegroundColor Yellow
    Write-Host ""

    $response = Read-Host "Proceed with deployment? (y/N)"
    return $response -eq 'y' -or $response -eq 'Y'
}

# =============================================================================
# Post-Deployment
# =============================================================================

function Invoke-PostDeployment {
    param([string]$DeploymentName)

    Write-Info "Running post-deployment tasks..."

    # Run validation script
    $validateScript = Join-Path $ScriptDir 'validate-resources.ps1'
    if (Test-Path $validateScript) {
        Write-Info "Validating deployed resources..."
        try {
            & $validateScript -Environment $Environment
        }
        catch {
            Write-WarningMessage "Resource validation had issues: $_"
        }
    }

    # Generate .env file for local development
    if ($Environment -eq 'dev') {
        Write-Info "Generating development environment file..."
        New-EnvironmentFile -DeploymentName $DeploymentName
    }

    Write-SuccessMessage "Post-deployment tasks complete"
}

function New-EnvironmentFile {
    param([string]$DeploymentName)

    $envFile = Join-Path $InfraDir '..' 'apps' 'api' '.env.azure'
    $kvName = "$Base-kv"

    try {
        $outputs = az deployment group show `
            --resource-group $ResourceGroup `
            --name $DeploymentName `
            --query "properties.outputs" `
            -o json 2>$null | ConvertFrom-Json

        if ($outputs) {
            $content = @"
# ===========================================
# Auto-generated Azure Environment Variables
# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# Environment: $Environment
# ===========================================

# Azure Provider
AZURE_PROVIDER_ENABLED=true

# Azure OpenAI / AI Foundry
# Configure via Azure Portal, API version auto-detected
AZURE_OPENAI_ENDPOINT=$($outputs.openAIEndpoint.value)
AZURE_OPENAI_DEPLOYMENT=gpt-4

# Azure Cosmos DB
AZURE_COSMOS_ENDPOINT=$($outputs.cosmosDBEndpoint.value)
AZURE_COSMOS_DATABASE=$($outputs.cosmosDBDatabaseName.value)

# Azure Redis
AZURE_REDIS_HOSTNAME=$($outputs.redisHostname.value)
AZURE_REDIS_PORT=$(Get-ValueOrDefault $outputs.redisPort.value '6380')

# Azure Storage
AZURE_STORAGE_ACCOUNT_NAME=$($outputs.storageAccountName.value)

# Azure App Insights
AZURE_APP_INSIGHTS_CONNECTION_STRING=$($outputs.appInsightsConnectionString.value)

# Key Vault (for retrieving secrets)
AZURE_KEY_VAULT_NAME=$($outputs.keyVaultName.value)

# Note: Sensitive values should be retrieved from Key Vault at runtime
# Use: az keyvault secret show --vault-name `$AZURE_KEY_VAULT_NAME --name <secret-name>
"@

            $content | Out-File -FilePath $envFile -Encoding UTF8
            Write-SuccessMessage "Generated: $envFile"
        }
    }
    catch {
        Write-WarningMessage "Could not retrieve deployment outputs: $_"
    }
}

# =============================================================================
# Main Execution
# =============================================================================

function Main {
    Write-Banner

    # Pre-flight checks
    Test-Prerequisites
    Write-Host ""

    # Validate templates
    Test-Templates
    Write-Host ""

    # Ensure resource group exists (needed for what-if)
    if (-not $ValidateOnly) {
        Ensure-ResourceGroup
        Write-Host ""
    }

    # Generate deployment name
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $deploymentName = "$ProjectName-$Environment-$timestamp"

    # What-if is the DEFAULT first step (unless skipped or validate-only)
    if (-not $ValidateOnly -and -not $SkipWhatIf) {
        Invoke-WhatIfAnalysis -DeploymentName "$deploymentName-whatif"
        Write-Host ""

        # If what-if only, stop here
        if ($WhatIfOnly) {
            Write-SuccessMessage "What-if analysis complete. No changes were made."
            return
        }

        # Prompt for confirmation before actual deployment
        if (-not (Get-DeploymentConfirmation)) {
            Write-WarningMessage "Deployment cancelled by user"
            return
        }
    }

    # Deploy
    Invoke-Deployment -DeploymentName $deploymentName
    Write-Host ""

    # Post-deployment (only for actual deployments)
    if (-not $ValidateOnly) {
        Invoke-PostDeployment -DeploymentName $deploymentName
        Write-Host ""
    }

    Write-SuccessMessage "All tasks completed successfully!"
}

# Run main
Main
