# =============================================================================
# Azure Resource Validation Script (PowerShell)
# =============================================================================
# Validates that required Azure resources exist before deployment or release.
#
# Usage:
#   ./validate-resources.ps1 -Environment dev
#   ./validate-resources.ps1 -Environment prod -Strict
#
# =============================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment = 'dev',

    [Parameter(Mandatory = $false)]
    [switch]$Strict
)

# =============================================================================
# Configuration
# =============================================================================

$ErrorActionPreference = 'Continue'
$Org = 'nl'
$ProjectName = 'convolens'
# Naming pattern per ADR-0027 (no region suffix): {org}-{env}-{project}-{type}
$Base = "$Org-$Environment-$ProjectName"
$BaseAlphanumeric = "$Org$Environment$ProjectName"
$ResourceGroup = "$Base-rg"

# Track validation results
$script:ValidationPassed = $true
$script:MissingResources = @()
$script:WarningResources = @()

# =============================================================================
# Utility Functions
# =============================================================================

function Write-Info { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param([string]$Message) Write-Host "[OK] $Message" -ForegroundColor Green }
function Write-Warning { param([string]$Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Write-Fail { param([string]$Message) Write-Host "[FAIL] $Message" -ForegroundColor Red }

function Test-ResourceExists {
    param(
        [string]$ResourceName,
        [string]$ResourceType,
        [scriptblock]$CheckScript,
        [bool]$Required = $true
    )

    Write-Host "  Checking $ResourceType`: " -NoNewline

    try {
        $result = & $CheckScript 2>$null
        if ($result -or $LASTEXITCODE -eq 0) {
            Write-Host $ResourceName -ForegroundColor Green -NoNewline
            Write-Host " [OK]" -ForegroundColor Green
            return $true
        }
    }
    catch {
        # Resource doesn't exist
    }

    if ($Required) {
        Write-Host $ResourceName -ForegroundColor Red -NoNewline
        Write-Host " [MISSING]" -ForegroundColor Red
        $script:ValidationPassed = $false
        $script:MissingResources += $ResourceType
    }
    else {
        Write-Host $ResourceName -ForegroundColor Yellow -NoNewline
        Write-Host " [NOT CONFIGURED]" -ForegroundColor Yellow
        $script:WarningResources += $ResourceType
    }

    return $false
}

# =============================================================================
# Resource Checks
# =============================================================================

function Test-AllResources {
    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host "  Azure Resource Validation" -ForegroundColor Cyan
    Write-Host "  Environment: $Environment" -ForegroundColor Cyan
    Write-Host "  Resource Group: $ResourceGroup" -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host ""

    # Required Resources
    Write-Host "Required Resources:" -ForegroundColor White
    Write-Host "-------------------" -ForegroundColor Gray

    # Resource Group
    Test-ResourceExists `
        -ResourceName $ResourceGroup `
        -ResourceType "Resource Group" `
        -CheckScript { az group show --name $ResourceGroup -o json } `
        -Required $true

    # Key Vault
    $kvName = "$Base-kv"
    Test-ResourceExists `
        -ResourceName $kvName `
        -ResourceType "Key Vault" `
        -CheckScript { az keyvault show --name $kvName -o json } `
        -Required $true

    # Storage Account (alphanumeric only, max 24 chars)
    $storageName = "${BaseAlphanumeric}st"
    Test-ResourceExists `
        -ResourceName $storageName `
        -ResourceType "Storage Account" `
        -CheckScript { az storage account show --name $storageName --resource-group $ResourceGroup -o json } `
        -Required $true

    # Application Insights
    $appiName = "$Base-appi"
    Test-ResourceExists `
        -ResourceName $appiName `
        -ResourceType "Application Insights" `
        -CheckScript { az monitor app-insights component show --app $appiName --resource-group $ResourceGroup -o json } `
        -Required $true

    # Container Apps Environment
    $caeName = "$Base-cae"
    Test-ResourceExists `
        -ResourceName $caeName `
        -ResourceType "Container Apps Environment" `
        -CheckScript { az containerapp env show --name $caeName --resource-group $ResourceGroup -o json } `
        -Required $true

    Write-Host ""

    # Optional Resources
    Write-Host "Optional Resources:" -ForegroundColor White
    Write-Host "-------------------" -ForegroundColor Gray

    # Azure OpenAI / AI Foundry
    $openaiName = "$Base-oai"
    Test-ResourceExists `
        -ResourceName $openaiName `
        -ResourceType "Azure OpenAI" `
        -CheckScript { az cognitiveservices account show --name $openaiName --resource-group $ResourceGroup -o json } `
        -Required $false

    # Cosmos DB
    $cosmosName = "$Base-cosmos"
    Test-ResourceExists `
        -ResourceName $cosmosName `
        -ResourceType "Cosmos DB" `
        -CheckScript { az cosmosdb show --name $cosmosName --resource-group $ResourceGroup -o json } `
        -Required $false

    # Redis Cache
    $redisName = "$Base-redis"
    Test-ResourceExists `
        -ResourceName $redisName `
        -ResourceType "Redis Cache" `
        -CheckScript { az redis show --name $redisName --resource-group $ResourceGroup -o json } `
        -Required $false

    # Static Web App
    $swaName = "$Base-swa"
    Test-ResourceExists `
        -ResourceName $swaName `
        -ResourceType "Static Web App" `
        -CheckScript { az staticwebapp show --name $swaName --resource-group $ResourceGroup -o json } `
        -Required $false

    Write-Host ""
}

# =============================================================================
# Secrets Check
# =============================================================================

function Test-KeyVaultSecrets {
    $kvName = "$Base-kv"

    Write-Host "Key Vault Secrets:" -ForegroundColor White
    Write-Host "------------------" -ForegroundColor Gray

    # Check if Key Vault exists first
    $kvExists = az keyvault show --name $kvName -o json 2>$null
    if (-not $kvExists) {
        Write-Warning "  Cannot check secrets - Key Vault does not exist"
        return
    }

    $secrets = @(
        @{ Name = "azure-openai-api-key"; Required = $false },
        @{ Name = "cosmos-db-key"; Required = $false },
        @{ Name = "redis-key"; Required = $false }
    )

    foreach ($secret in $secrets) {
        Write-Host "  Checking secret: " -NoNewline

        try {
            $result = az keyvault secret show --vault-name $kvName --name $secret.Name -o json 2>$null
            if ($result) {
                Write-Host $secret.Name -ForegroundColor Green -NoNewline
                Write-Host " [OK]" -ForegroundColor Green
            }
            else {
                throw "Not found"
            }
        }
        catch {
            if ($secret.Required) {
                Write-Host $secret.Name -ForegroundColor Red -NoNewline
                Write-Host " [MISSING]" -ForegroundColor Red
                $script:ValidationPassed = $false
            }
            else {
                Write-Host $secret.Name -ForegroundColor Yellow -NoNewline
                Write-Host " [NOT SET]" -ForegroundColor Yellow
            }
        }
    }

    Write-Host ""
}

# =============================================================================
# Summary
# =============================================================================

function Write-Summary {
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host "  Validation Summary" -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host ""

    if ($script:ValidationPassed) {
        Write-Host "  Status: " -NoNewline
        Write-Host "PASSED" -ForegroundColor Green
    }
    else {
        Write-Host "  Status: " -NoNewline
        Write-Host "FAILED" -ForegroundColor Red
    }

    if ($script:MissingResources.Count -gt 0) {
        Write-Host ""
        Write-Host "  Missing Required Resources:" -ForegroundColor Red
        foreach ($resource in $script:MissingResources) {
            Write-Host "    - $resource" -ForegroundColor Red
        }
    }

    if ($script:WarningResources.Count -gt 0) {
        Write-Host ""
        Write-Host "  Optional Resources Not Configured:" -ForegroundColor Yellow
        foreach ($resource in $script:WarningResources) {
            Write-Host "    - $resource" -ForegroundColor Yellow
        }
    }

    Write-Host ""

    if (-not $script:ValidationPassed) {
        Write-Host "  To deploy missing resources, run:" -ForegroundColor Cyan
        Write-Host "    ./deploy.ps1 -Environment $Environment" -ForegroundColor White
        Write-Host ""
    }
}

# =============================================================================
# Main
# =============================================================================

function Main {
    # Check Azure CLI login
    $account = az account show -o json 2>$null | ConvertFrom-Json
    if (-not $account) {
        Write-Fail "Not logged into Azure. Run: az login"
        exit 1
    }

    Test-AllResources
    Test-KeyVaultSecrets
    Write-Summary

    if ($Strict -and -not $script:ValidationPassed) {
        Write-Fail "Strict mode: Validation failed due to missing required resources"
        exit 1
    }

    if ($script:ValidationPassed) {
        exit 0
    }
    else {
        exit 1
    }
}

Main
