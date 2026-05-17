data "azurerm_client_config" "current" {}

locals {
  prefix       = "${var.org}-${var.env}-${var.projname}"
  alphanumeric = lower(replace(local.prefix, "-", ""))

  rg_name      = "${local.prefix}-rg"
  law_name     = "${local.prefix}-law"
  ai_name      = "${local.prefix}-appi"
  storage_name = substr("${local.alphanumeric}st", 0, 24)
  kv_name      = substr("${local.prefix}-kv", 0, 24)
  cosmos_name  = "${local.prefix}-cosmos"
  cae_name     = "${local.prefix}-cae"
  api_name     = "${local.prefix}-api"
  swa_name     = "${local.prefix}-swa"
  redis_name   = "${local.prefix}-redis"
  oai_name     = "${local.prefix}-oai"

  base_tags = {
    org         = var.org
    project     = var.projname
    environment = var.env
    managedBy   = "terraform"
  }
  tags = merge(local.base_tags, var.tags)

  blob_containers = ["chat-exports", "user-uploads", "summaries"]

  cosmos_containers = [
    { name = "users", partition_key = "/id" },
    { name = "chats", partition_key = "/userId" },
    { name = "summaries", partition_key = "/chatId" },
  ]

  is_prod = var.env == "prod"

  redis_capacity = local.is_prod ? 1 : 0
  redis_sku      = local.is_prod ? "Standard" : "Basic"

  storage_sku = local.is_prod ? "Standard_GRS" : "Standard_LRS"

  ai_retention_days = local.is_prod ? 90 : 30

  api_cpu          = local.is_prod ? 1.0 : 0.5
  api_memory       = local.is_prod ? "2.0Gi" : "1.0Gi"
  api_min_replicas = local.is_prod ? 2 : 0
  api_max_replicas = local.is_prod ? 10 : 3
}

resource "azurerm_resource_group" "rg" {
  name     = local.rg_name
  location = var.location
  tags     = local.tags
}

resource "azurerm_log_analytics_workspace" "law" {
  name                = local.law_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
  retention_in_days   = local.ai_retention_days
  tags                = local.tags
}

resource "azurerm_application_insights" "ai" {
  name                = local.ai_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  workspace_id        = azurerm_log_analytics_workspace.law.id
  application_type    = "web"
  retention_in_days   = local.ai_retention_days
  tags                = local.tags
}

resource "azurerm_storage_account" "st" {
  name                            = local.storage_name
  location                        = azurerm_resource_group.rg.location
  resource_group_name             = azurerm_resource_group.rg.name
  account_tier                    = "Standard"
  account_replication_type        = local.is_prod ? "GRS" : "LRS"
  account_kind                    = "StorageV2"
  access_tier                     = "Hot"
  min_tls_version                 = "TLS1_2"
  https_traffic_only_enabled      = true
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = true
  tags                            = local.tags

  blob_properties {
    versioning_enabled = local.is_prod

    delete_retention_policy {
      days = 7
    }

    container_delete_retention_policy {
      days = 7
    }
  }

  network_rules {
    bypass         = ["AzureServices"]
    default_action = "Allow"
  }
}

resource "azurerm_storage_container" "containers" {
  for_each              = toset(local.blob_containers)
  name                  = each.value
  storage_account_id    = azurerm_storage_account.st.id
  container_access_type = "private"
}

resource "azurerm_cosmosdb_account" "cosmos" {
  count                         = var.enable_cosmos ? 1 : 0
  name                          = local.cosmos_name
  location                      = azurerm_resource_group.rg.location
  resource_group_name           = azurerm_resource_group.rg.name
  offer_type                    = "Standard"
  kind                          = "GlobalDocumentDB"
  free_tier_enabled             = false
  public_network_access_enabled = true
  automatic_failover_enabled    = false
  tags                          = local.tags

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = var.location
    failover_priority = 0
    zone_redundant    = false
  }

  capabilities {
    name = "EnableServerless"
  }
}

resource "azurerm_cosmosdb_sql_database" "db" {
  count               = var.enable_cosmos ? 1 : 0
  name                = var.database_name
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos[0].name
}

resource "azurerm_cosmosdb_sql_container" "containers" {
  for_each            = var.enable_cosmos ? { for c in local.cosmos_containers : c.name => c } : {}
  name                = each.value.name
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos[0].name
  database_name       = azurerm_cosmosdb_sql_database.db[0].name
  partition_key_paths = [each.value.partition_key]

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }
  }
}

resource "azurerm_key_vault" "kv" {
  name                            = local.kv_name
  location                        = azurerm_resource_group.rg.location
  resource_group_name             = azurerm_resource_group.rg.name
  tenant_id                       = data.azurerm_client_config.current.tenant_id
  sku_name                        = "standard"
  enabled_for_deployment          = true
  enabled_for_template_deployment = true
  rbac_authorization_enabled      = false
  purge_protection_enabled        = local.is_prod
  soft_delete_retention_days      = local.is_prod ? 30 : 7
  public_network_access_enabled   = true
  tags                            = local.tags

  network_acls {
    bypass         = "AzureServices"
    default_action = "Allow"
  }
}

resource "azurerm_key_vault_access_policy" "deployer" {
  key_vault_id = azurerm_key_vault.kv.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  secret_permissions = ["Get", "List", "Set", "Delete", "Purge", "Recover"]
}

resource "azurerm_key_vault_secret" "cosmos_endpoint" {
  count        = var.enable_cosmos ? 1 : 0
  name         = "cosmos-db-endpoint"
  value        = azurerm_cosmosdb_account.cosmos[0].endpoint
  key_vault_id = azurerm_key_vault.kv.id

  depends_on = [azurerm_key_vault_access_policy.deployer]
}

resource "azurerm_key_vault_secret" "cosmos_key" {
  count        = var.enable_cosmos ? 1 : 0
  name         = "cosmos-db-key"
  value        = azurerm_cosmosdb_account.cosmos[0].primary_key
  key_vault_id = azurerm_key_vault.kv.id

  depends_on = [azurerm_key_vault_access_policy.deployer]
}

resource "azurerm_key_vault_secret" "cosmos_connection_string" {
  count        = var.enable_cosmos ? 1 : 0
  name         = "cosmos-db-connection-string"
  value        = azurerm_cosmosdb_account.cosmos[0].primary_sql_connection_string
  key_vault_id = azurerm_key_vault.kv.id

  depends_on = [azurerm_key_vault_access_policy.deployer]
}

resource "azurerm_key_vault_secret" "appinsights_connection_string" {
  name         = "appinsights-connection-string"
  value        = azurerm_application_insights.ai.connection_string
  key_vault_id = azurerm_key_vault.kv.id

  depends_on = [azurerm_key_vault_access_policy.deployer]
}

resource "azurerm_key_vault_secret" "storage_connection_string" {
  name         = "storage-connection-string"
  value        = azurerm_storage_account.st.primary_connection_string
  key_vault_id = azurerm_key_vault.kv.id

  depends_on = [azurerm_key_vault_access_policy.deployer]
}

resource "azurerm_redis_cache" "redis" {
  count               = var.enable_redis ? 1 : 0
  name                = local.redis_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  capacity            = local.redis_capacity
  family              = "C"
  sku_name            = local.redis_sku
  minimum_tls_version = "1.2"
  tags                = local.tags
}

resource "azurerm_key_vault_secret" "redis_password" {
  count        = var.enable_redis ? 1 : 0
  name         = "redis-password"
  value        = azurerm_redis_cache.redis[0].primary_access_key
  key_vault_id = azurerm_key_vault.kv.id

  depends_on = [azurerm_key_vault_access_policy.deployer]
}

resource "azurerm_cognitive_account" "openai" {
  count                 = var.enable_openai ? 1 : 0
  name                  = local.oai_name
  location              = azurerm_resource_group.rg.location
  resource_group_name   = azurerm_resource_group.rg.name
  kind                  = "OpenAI"
  sku_name              = "S0"
  custom_subdomain_name = local.oai_name
  tags                  = local.tags
}

resource "azurerm_container_app_environment" "cae" {
  count                      = var.enable_container_apps ? 1 : 0
  name                       = local.cae_name
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.law.id
  tags                       = local.tags
}

resource "azurerm_container_app" "api" {
  count                        = var.enable_container_apps ? 1 : 0
  name                         = local.api_name
  container_app_environment_id = azurerm_container_app_environment.cae[0].id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"
  tags                         = local.tags

  identity {
    type = "SystemAssigned"
  }

  secret {
    name  = "appinsights-connection-string"
    value = azurerm_application_insights.ai.connection_string
  }

  ingress {
    external_enabled = true
    target_port      = 3001
    transport        = "http"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }

    cors {
      allowed_origins = ["*"]
      allowed_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
      allowed_headers = ["*"]
    }
  }

  template {
    min_replicas = local.api_min_replicas
    max_replicas = local.api_max_replicas

    container {
      name   = "api"
      image  = var.container_image_api
      cpu    = local.api_cpu
      memory = local.api_memory

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "PORT"
        value = "3001"
      }
      env {
        name        = "APPLICATIONINSIGHTS_CONNECTION_STRING"
        secret_name = "appinsights-connection-string"
      }
      env {
        name  = "AZURE_COSMOS_ENDPOINT"
        value = var.enable_cosmos ? azurerm_cosmosdb_account.cosmos[0].endpoint : ""
      }
      env {
        name  = "AZURE_REDIS_HOSTNAME"
        value = var.enable_redis ? azurerm_redis_cache.redis[0].hostname : ""
      }
      env {
        name  = "AZURE_STORAGE_ACCOUNT_NAME"
        value = azurerm_storage_account.st.name
      }
      env {
        name  = "AZURE_OPENAI_ENDPOINT"
        value = var.enable_openai ? azurerm_cognitive_account.openai[0].endpoint : ""
      }
      env {
        name  = "AZURE_KEY_VAULT_NAME"
        value = azurerm_key_vault.kv.name
      }
    }

    http_scale_rule {
      name                = "http-rule"
      concurrent_requests = "100"
    }
  }
}

resource "azurerm_key_vault_access_policy" "container_app" {
  count        = var.enable_container_apps ? 1 : 0
  key_vault_id = azurerm_key_vault.kv.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_container_app.api[0].identity[0].principal_id

  secret_permissions = ["Get", "List"]
}

resource "azurerm_static_web_app" "swa" {
  count               = var.enable_static_web_app ? 1 : 0
  name                = local.swa_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku_tier            = "Free"
  sku_size            = "Free"
  tags                = local.tags
}

resource "azurerm_consumption_budget_resource_group" "budget" {
  count             = var.enable_budget_alerts && var.admin_email != "" ? 1 : 0
  name              = "${local.prefix}-budget"
  resource_group_id = azurerm_resource_group.rg.id
  amount            = var.monthly_budget_amount
  time_grain        = "Monthly"

  time_period {
    start_date = formatdate("YYYY-MM-01'T'00:00:00'Z'", timestamp())
  }

  notification {
    enabled        = true
    operator       = "GreaterThan"
    threshold      = 80
    threshold_type = "Actual"
    contact_emails = [var.admin_email]
  }

  notification {
    enabled        = true
    operator       = "GreaterThan"
    threshold      = 100
    threshold_type = "Forecasted"
    contact_emails = [var.admin_email]
  }

  lifecycle {
    ignore_changes = [time_period]
  }
}
