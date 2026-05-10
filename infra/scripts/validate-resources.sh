#!/bin/bash
# =============================================================================
# Azure Resource Validation Script
# =============================================================================
# Validates that all required Azure resources exist and are properly configured
# before deployment or release.
#
# Usage:
#   ./validate-resources.sh <environment> [--strict]
#
# Arguments:
#   environment  - dev, staging, or prod
#   --strict     - Fail on any missing or misconfigured resource
#
# Requirements:
#   - Azure CLI installed and logged in
#   - jq installed for JSON parsing
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-dev}"
STRICT_MODE="${2:-}"
ORG="nl"
PROJECT_NAME="convolens"
# Naming pattern per ADR-0027 (no region suffix): {org}-{env}-{project}-{type}
BASE="${ORG}-${ENVIRONMENT}-${PROJECT_NAME}"
# Hyphen-stripped variant for resources where Azure forbids hyphens (storage)
BASE_ALPHANUMERIC="${ORG}${ENVIRONMENT}${PROJECT_NAME}"

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# =============================================================================
# Utility Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNING_CHECKS++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_CHECKS++))
}

check_resource() {
    local resource_type="$1"
    local resource_name="$2"
    local resource_group="$3"
    local required="$4"  # true or false

    ((TOTAL_CHECKS++))

    if az resource show --resource-type "$resource_type" --name "$resource_name" --resource-group "$resource_group" &>/dev/null; then
        log_success "$resource_type: $resource_name exists"
        return 0
    else
        if [ "$required" = "true" ]; then
            log_error "$resource_type: $resource_name NOT FOUND (required)"
            return 1
        else
            log_warning "$resource_type: $resource_name not found (optional)"
            return 0
        fi
    fi
}

# =============================================================================
# Validation Functions
# =============================================================================

validate_resource_group() {
    local rg_name="${BASE}-rg"

    log_info "Checking Resource Group: $rg_name"
    ((TOTAL_CHECKS++))

    if az group show --name "$rg_name" &>/dev/null; then
        log_success "Resource Group exists: $rg_name"
        RESOURCE_GROUP="$rg_name"
        return 0
    else
        log_error "Resource Group NOT FOUND: $rg_name"
        return 1
    fi
}

validate_key_vault() {
    local kv_name="${BASE}-kv"

    log_info "Checking Key Vault..."
    check_resource "Microsoft.KeyVault/vaults" "$kv_name" "$RESOURCE_GROUP" "true"

    # Check for required secrets
    if az keyvault show --name "$kv_name" &>/dev/null; then
        log_info "Checking Key Vault secrets..."

        local required_secrets=("azure-openai-api-key" "cosmos-db-key" "redis-password")
        for secret in "${required_secrets[@]}"; do
            ((TOTAL_CHECKS++))
            if az keyvault secret show --vault-name "$kv_name" --name "$secret" &>/dev/null; then
                log_success "Secret exists: $secret"
            else
                log_warning "Secret missing: $secret"
            fi
        done
    fi
}

validate_storage() {
    # Storage Account names: alphanumeric only, max 24 chars
    local storage_name="${BASE_ALPHANUMERIC}st"

    log_info "Checking Storage Account..."
    check_resource "Microsoft.Storage/storageAccounts" "$storage_name" "$RESOURCE_GROUP" "true"

    # Check containers
    if az storage account show --name "$storage_name" &>/dev/null; then
        log_info "Checking blob containers..."

        local required_containers=("chat-exports" "user-uploads" "summaries")
        local connection_string=$(az storage account show-connection-string --name "$storage_name" --resource-group "$RESOURCE_GROUP" -o tsv 2>/dev/null)

        for container in "${required_containers[@]}"; do
            ((TOTAL_CHECKS++))
            if az storage container show --name "$container" --connection-string "$connection_string" &>/dev/null; then
                log_success "Container exists: $container"
            else
                log_warning "Container missing: $container"
            fi
        done
    fi
}

validate_openai() {
    local openai_name="${BASE}-oai"

    log_info "Checking Azure OpenAI..."

    ((TOTAL_CHECKS++))
    if az cognitiveservices account show --name "$openai_name" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
        log_success "Azure OpenAI exists: $openai_name"

        # Check deployments
        log_info "Checking OpenAI model deployments..."
        local deployments=$(az cognitiveservices account deployment list --name "$openai_name" --resource-group "$RESOURCE_GROUP" -o json 2>/dev/null)

        local required_models=("gpt-4" "gpt-35-turbo")
        for model in "${required_models[@]}"; do
            ((TOTAL_CHECKS++))
            if echo "$deployments" | jq -e ".[] | select(.name == \"$model\")" &>/dev/null; then
                log_success "Model deployment exists: $model"
            else
                log_warning "Model deployment missing: $model"
            fi
        done
    else
        log_warning "Azure OpenAI not found: $openai_name (optional)"
    fi
}

validate_cosmos_db() {
    local cosmos_name="${BASE}-cosmos"

    log_info "Checking Cosmos DB..."

    ((TOTAL_CHECKS++))
    if az cosmosdb show --name "$cosmos_name" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
        log_success "Cosmos DB exists: $cosmos_name"

        # Check database and containers
        log_info "Checking Cosmos DB containers..."
        # COSMOS_DATABASE_NAME may be set explicitly if bicep databaseName param differs from projectName
        local db_name="${COSMOS_DATABASE_NAME:-$PROJECT_NAME}"
        local containers=$(az cosmosdb sql container list --account-name "$cosmos_name" --database-name "$db_name" --resource-group "$RESOURCE_GROUP" -o json 2>/dev/null)

        local required_containers=("users" "chats" "summaries")
        for container in "${required_containers[@]}"; do
            ((TOTAL_CHECKS++))
            if echo "$containers" | jq -e ".[] | select(.name == \"$container\")" &>/dev/null; then
                log_success "Container exists: $container"
            else
                log_warning "Container missing: $container"
            fi
        done
    else
        log_warning "Cosmos DB not found: $cosmos_name (optional)"
    fi
}

validate_redis() {
    local redis_name="${BASE}-redis"

    log_info "Checking Redis Cache..."

    ((TOTAL_CHECKS++))
    if az redis show --name "$redis_name" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
        log_success "Redis Cache exists: $redis_name"

        # Check status
        local status=$(az redis show --name "$redis_name" --resource-group "$RESOURCE_GROUP" --query "provisioningState" -o tsv 2>/dev/null)
        ((TOTAL_CHECKS++))
        if [ "$status" = "Succeeded" ]; then
            log_success "Redis Cache status: $status"
        else
            log_warning "Redis Cache status: $status (expected: Succeeded)"
        fi
    else
        log_warning "Redis Cache not found: $redis_name (optional)"
    fi
}

validate_app_insights() {
    local appi_name="${BASE}-appi"

    log_info "Checking Application Insights..."
    check_resource "Microsoft.Insights/components" "$appi_name" "$RESOURCE_GROUP" "true"
}

validate_container_apps() {
    local env_name="${BASE}-cae"
    local app_name="${BASE}-api"

    log_info "Checking Container Apps Environment..."

    ((TOTAL_CHECKS++))
    if az containerapp env show --name "$env_name" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
        log_success "Container Apps Environment exists: $env_name"

        # Check API app
        log_info "Checking API Container App..."
        ((TOTAL_CHECKS++))
        if az containerapp show --name "$app_name" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
            log_success "API Container App exists: $app_name"

            # Check if running
            local running=$(az containerapp show --name "$app_name" --resource-group "$RESOURCE_GROUP" --query "properties.runningStatus" -o tsv 2>/dev/null)
            ((TOTAL_CHECKS++))
            if [ "$running" = "Running" ]; then
                log_success "API Container App status: Running"
            else
                log_warning "API Container App status: $running"
            fi
        else
            log_warning "API Container App not found: $app_name"
        fi
    else
        log_warning "Container Apps Environment not found: $env_name (optional)"
    fi
}

validate_static_web_app() {
    local swa_name="${BASE}-swa"

    log_info "Checking Static Web App..."

    ((TOTAL_CHECKS++))
    if az staticwebapp show --name "$swa_name" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
        log_success "Static Web App exists: $swa_name"
    else
        log_warning "Static Web App not found: $swa_name (optional)"
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    echo ""
    echo "=============================================="
    echo "  Azure Resource Validation"
    echo "  Environment: $ENVIRONMENT"
    echo "  Project: $PROJECT_NAME"
    echo "=============================================="
    echo ""

    # Check Azure CLI
    if ! command -v az &>/dev/null; then
        log_error "Azure CLI not found. Please install: https://docs.microsoft.com/cli/azure/install-azure-cli"
        exit 1
    fi

    # Check login
    if ! az account show &>/dev/null; then
        log_error "Not logged into Azure. Run: az login"
        exit 1
    fi

    # Show current subscription
    local subscription=$(az account show --query "name" -o tsv)
    log_info "Using subscription: $subscription"
    echo ""

    # Run validations
    validate_resource_group || { log_error "Resource group validation failed. Cannot continue."; exit 1; }
    echo ""

    validate_key_vault
    echo ""

    validate_storage
    echo ""

    validate_openai
    echo ""

    validate_cosmos_db
    echo ""

    validate_redis
    echo ""

    validate_app_insights
    echo ""

    validate_container_apps
    echo ""

    validate_static_web_app
    echo ""

    # Summary
    echo "=============================================="
    echo "  Validation Summary"
    echo "=============================================="
    echo -e "  Total checks:   $TOTAL_CHECKS"
    echo -e "  ${GREEN}Passed:${NC}         $PASSED_CHECKS"
    echo -e "  ${YELLOW}Warnings:${NC}       $WARNING_CHECKS"
    echo -e "  ${RED}Failed:${NC}         $FAILED_CHECKS"
    echo "=============================================="
    echo ""

    # Exit code
    if [ "$STRICT_MODE" = "--strict" ] && [ $FAILED_CHECKS -gt 0 ]; then
        log_error "Validation failed in strict mode"
        exit 1
    elif [ $FAILED_CHECKS -gt 0 ]; then
        log_warning "Some required resources are missing"
        exit 1
    else
        log_success "All validations passed"
        exit 0
    fi
}

# Run main function
main "$@"
