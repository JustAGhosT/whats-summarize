#!/bin/bash
# =============================================================================
# Azure Infrastructure Deployment Script
# =============================================================================
# Deploys or updates Azure infrastructure using Bicep templates.
#
# Usage:
#   ./deploy.sh [environment] [options]
#
# Arguments:
#   environment     - dev, staging, or prod (default: dev)
#
# Options:
#   --what-if       - Preview changes without deploying
#   --validate-only - Only validate templates, don't deploy
#   --skip-what-if  - Skip what-if preview (not recommended)
#   --force         - Skip confirmation prompts
#   -h, --help      - Show this help message
#
# Requirements:
#   - Azure CLI installed and logged in
#   - Bicep CLI installed (usually comes with Azure CLI)
#   - jq installed (for JSON parsing)
# =============================================================================

set -e
set -o pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
ENVIRONMENT="dev"
WHAT_IF=false
VALIDATE_ONLY=false
SKIP_WHAT_IF=false
FORCE=false
ORG="nl"
PROJECT_NAME="convolens"
LOCATION="eastus"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --what-if)
            WHAT_IF=true
            shift
            ;;
        --validate-only)
            VALIDATE_ONLY=true
            shift
            ;;
        --skip-what-if)
            SKIP_WHAT_IF=true
            shift
            ;;
        --force|-f)
            FORCE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [environment] [options]"
            echo ""
            echo "Arguments:"
            echo "  environment      - dev, staging, or prod (default: dev)"
            echo ""
            echo "Options:"
            echo "  --what-if        - Preview changes without deploying"
            echo "  --validate-only  - Only validate templates, don't deploy"
            echo "  --skip-what-if   - Skip automatic what-if preview (not recommended)"
            echo "  --force, -f      - Skip confirmation prompts"
            echo "  -h, --help       - Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 dev                    # Deploy to dev (what-if first)"
            echo "  $0 prod --what-if         # Preview production changes only"
            echo "  $0 staging --validate-only # Validate staging templates"
            echo "  $0 prod --skip-what-if    # Deploy to prod without preview"
            exit 0
            ;;
        -*)
            echo "Unknown option: $1" >&2
            echo "Use --help for usage information" >&2
            exit 1
            ;;
        *)
            # Positional argument (environment)
            if [[ "$1" =~ ^(dev|staging|prod)$ ]]; then
                ENVIRONMENT="$1"
            else
                echo "Invalid environment: $1" >&2
                echo "Valid options: dev, staging, prod" >&2
                exit 1
            fi
            shift
            ;;
    esac
done

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
BICEP_DIR="${INFRA_DIR}/bicep"
PARAMS_DIR="${INFRA_DIR}/parameters"

# Resource naming per ADR-0027 (no region suffix): {org}-{env}-{project}-{type}
BASE="${ORG}-${ENVIRONMENT}-${PROJECT_NAME}"
RESOURCE_GROUP="${BASE}-rg"

# =============================================================================
# Utility Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# Pre-flight Checks
# =============================================================================

preflight_checks() {
    log_info "Running pre-flight checks..."

    # Check Azure CLI
    if ! command -v az &>/dev/null; then
        log_error "Azure CLI not found. Please install: https://docs.microsoft.com/cli/azure/install-azure-cli"
        exit 1
    fi

    # Check jq (required for JSON parsing)
    if ! command -v jq &>/dev/null; then
        log_error "jq not found. Please install: apt-get install jq (Linux) or brew install jq (macOS)"
        exit 1
    fi

    # Check Bicep
    if ! az bicep version &>/dev/null; then
        log_info "Installing Bicep CLI..."
        az bicep install
    fi

    # Check login
    if ! az account show &>/dev/null; then
        log_error "Not logged into Azure. Run: az login"
        exit 1
    fi

    # Check parameter file exists
    local param_file="${PARAMS_DIR}/${ENVIRONMENT}.bicepparam"
    if [ ! -f "$param_file" ]; then
        log_error "Parameter file not found: $param_file"
        exit 1
    fi

    # Check main.bicep exists
    if [ ! -f "${BICEP_DIR}/main.bicep" ]; then
        log_error "Main Bicep file not found: ${BICEP_DIR}/main.bicep"
        exit 1
    fi

    log_success "Pre-flight checks passed"
}

# =============================================================================
# Validation
# =============================================================================

validate_templates() {
    log_info "Validating Bicep templates..."

    # Build all Bicep files to check for errors
    az bicep build --file "${BICEP_DIR}/main.bicep" --stdout > /dev/null

    log_success "Template validation passed"
}

# =============================================================================
# Resource Group
# =============================================================================

ensure_resource_group() {
    log_info "Ensuring resource group exists: $RESOURCE_GROUP"

    if az group show --name "$RESOURCE_GROUP" &>/dev/null; then
        log_info "Resource group already exists"
    else
        log_info "Creating resource group..."
        az group create \
            --name "$RESOURCE_GROUP" \
            --location "$LOCATION" \
            --tags org="$ORG" project="$PROJECT_NAME" environment="$ENVIRONMENT" managedBy="bicep"
        log_success "Resource group created"
    fi
}

# =============================================================================
# Deployment
# =============================================================================

run_what_if() {
    local param_file="${PARAMS_DIR}/${ENVIRONMENT}.bicepparam"
    local deployment_name="convolens-${ENVIRONMENT}-whatif-$(date +%Y%m%d-%H%M%S)"

    echo ""
    echo -e "${YELLOW}=============================================="
    echo "  WHAT-IF ANALYSIS"
    echo "  Previewing changes..."
    echo "==============================================${NC}"
    echo ""

    az deployment group what-if \
        --resource-group "$RESOURCE_GROUP" \
        --template-file "${BICEP_DIR}/main.bicep" \
        --parameters "$param_file" \
        --name "$deployment_name"

    log_success "What-if analysis complete"
}

confirm_deployment() {
    if [[ "$FORCE" = true ]]; then
        return 0
    fi

    echo ""
    echo -e "${YELLOW}=============================================="
    echo "  READY TO DEPLOY"
    echo "==============================================${NC}"
    echo ""
    echo "Environment: $ENVIRONMENT"
    echo "Resource Group: $RESOURCE_GROUP"
    echo ""

    # Extra warning for production
    if [[ "$ENVIRONMENT" = "prod" ]]; then
        echo -e "${RED}⚠️  WARNING: You are about to deploy to PRODUCTION!${NC}"
        echo ""
        read -p "Type 'yes' to confirm production deployment: " confirm
        if [[ "$confirm" != "yes" ]]; then
            log_warning "Deployment cancelled by user"
            exit 0
        fi
    else
        read -p "Proceed with deployment? (y/N): " confirm
        if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
            log_warning "Deployment cancelled by user"
            exit 0
        fi
    fi
}

deploy_infrastructure() {
    local param_file="${PARAMS_DIR}/${ENVIRONMENT}.bicepparam"
    local deployment_name="convolens-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S)"

    log_info "Starting deployment: $deployment_name"
    log_info "Environment: $ENVIRONMENT"
    log_info "Resource Group: $RESOURCE_GROUP"
    log_info "Parameter File: $param_file"
    echo ""

    if [[ "$VALIDATE_ONLY" = true ]]; then
        log_info "Validating deployment..."
        az deployment group validate \
            --resource-group "$RESOURCE_GROUP" \
            --template-file "${BICEP_DIR}/main.bicep" \
            --parameters "$param_file" \
            --name "$deployment_name"

        log_success "Deployment validation passed"
        return
    fi

    if [[ "$WHAT_IF" = true ]]; then
        run_what_if
        return
    fi

    # Default behavior: run what-if first, then deploy
    if [[ "$SKIP_WHAT_IF" = false ]]; then
        run_what_if
        confirm_deployment
    fi

    echo ""
    echo -e "${GREEN}=============================================="
    echo "  DEPLOYING INFRASTRUCTURE"
    echo "==============================================${NC}"
    echo ""

    log_info "Deploying infrastructure..."
    az deployment group create \
        --resource-group "$RESOURCE_GROUP" \
        --template-file "${BICEP_DIR}/main.bicep" \
        --parameters "$param_file" \
        --name "$deployment_name" \
        --verbose

    log_success "Deployment complete!"

    # Show outputs
    echo ""
    log_info "Deployment Outputs:"
    az deployment group show \
        --resource-group "$RESOURCE_GROUP" \
        --name "$deployment_name" \
        --query "properties.outputs" \
        -o json
}

# =============================================================================
# Post-deployment
# =============================================================================

post_deployment() {
    log_info "Running post-deployment tasks..."

    # Run validation script
    if [ -x "${SCRIPT_DIR}/validate-resources.sh" ]; then
        log_info "Validating deployed resources..."
        "${SCRIPT_DIR}/validate-resources.sh" "$ENVIRONMENT" || true
    fi

    # Generate .env file for local development
    if [ "$ENVIRONMENT" = "dev" ]; then
        log_info "Generating development environment file..."
        generate_env_file
    fi

    log_success "Post-deployment tasks complete"
}

generate_env_file() {
    local env_file="${INFRA_DIR}/../apps/api/.env.azure"
    local kv_name="${BASE}-kv"

    log_info "Generating .env.azure file..."

    # Get outputs from deployment
    local outputs=$(az deployment group show \
        --resource-group "$RESOURCE_GROUP" \
        --name "$(az deployment group list --resource-group "$RESOURCE_GROUP" --query "[0].name" -o tsv)" \
        --query "properties.outputs" \
        -o json 2>/dev/null)

    if [ -n "$outputs" ]; then
        cat > "$env_file" << EOF
# ===========================================
# Auto-generated Azure Environment Variables
# Generated: $(date)
# Environment: $ENVIRONMENT
# ===========================================

# Azure Provider
AZURE_PROVIDER_ENABLED=true

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=$(echo "$outputs" | jq -r '.openAIEndpoint.value // ""')
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Azure Cosmos DB
AZURE_COSMOS_ENDPOINT=$(echo "$outputs" | jq -r '.cosmosDBEndpoint.value // ""')
AZURE_COSMOS_DATABASE=$(echo "$outputs" | jq -r '.cosmosDBDatabaseName.value // ""')

# Azure Redis
AZURE_REDIS_HOSTNAME=$(echo "$outputs" | jq -r '.redisHostname.value // ""')
AZURE_REDIS_PORT=$(echo "$outputs" | jq -r '.redisPort.value // "6380"')

# Azure Storage
AZURE_STORAGE_ACCOUNT_NAME=$(echo "$outputs" | jq -r '.storageAccountName.value // ""')

# Azure App Insights
AZURE_APP_INSIGHTS_CONNECTION_STRING=$(echo "$outputs" | jq -r '.appInsightsConnectionString.value // ""')

# Key Vault (for retrieving secrets)
AZURE_KEY_VAULT_NAME=$(echo "$outputs" | jq -r '.keyVaultName.value // ""')

# Note: Sensitive values should be retrieved from Key Vault at runtime
# Use: az keyvault secret show --vault-name \$AZURE_KEY_VAULT_NAME --name <secret-name>
EOF
        log_success "Generated: $env_file"
    else
        log_warning "Could not retrieve deployment outputs"
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    echo ""
    echo "=============================================="
    echo "  Azure Infrastructure Deployment"
    echo "  Environment: $ENVIRONMENT"
    echo "  Project: $PROJECT_NAME"
    echo "=============================================="
    echo ""

    preflight_checks
    echo ""

    validate_templates
    echo ""

    if [[ "$VALIDATE_ONLY" = false ]]; then
        ensure_resource_group
        echo ""
    fi

    deploy_infrastructure
    echo ""

    if [[ "$WHAT_IF" = false && "$VALIDATE_ONLY" = false ]]; then
        post_deployment
        echo ""
    fi

    log_success "All tasks completed successfully!"
}

# Run main function
main
