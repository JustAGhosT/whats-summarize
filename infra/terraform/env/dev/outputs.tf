output "resource_group_name" {
  value       = azurerm_resource_group.rg.name
  description = "Resource group containing all convolens dev resources."
}

output "key_vault_name" {
  value       = azurerm_key_vault.kv.name
  description = "Key Vault holding application secrets."
}

output "key_vault_uri" {
  value       = azurerm_key_vault.kv.vault_uri
  description = "Key Vault dataplane URI."
}

output "storage_account_name" {
  value       = azurerm_storage_account.st.name
  description = "Storage account name for blob containers."
}

output "storage_blob_endpoint" {
  value       = azurerm_storage_account.st.primary_blob_endpoint
  description = "Public blob endpoint."
}

output "appinsights_connection_string" {
  value       = azurerm_application_insights.ai.connection_string
  description = "Application Insights connection string. Forwarded to the API container as APPLICATIONINSIGHTS_CONNECTION_STRING."
  sensitive   = true
}

output "log_analytics_workspace_id" {
  value       = azurerm_log_analytics_workspace.law.id
  description = "Log Analytics workspace ARM ID (referenced by Container Apps env)."
}

output "cosmos_endpoint" {
  value       = var.enable_cosmos ? azurerm_cosmosdb_account.cosmos[0].endpoint : ""
  description = "Cosmos DB document endpoint, empty when enable_cosmos = false."
}

output "cosmos_database_name" {
  value       = var.enable_cosmos ? azurerm_cosmosdb_sql_database.db[0].name : ""
  description = "Cosmos SQL database name, empty when enable_cosmos = false."
}

output "redis_hostname" {
  value       = var.enable_redis ? azurerm_redis_cache.redis[0].hostname : ""
  description = "Redis hostname, empty when enable_redis = false."
}

output "openai_endpoint" {
  value       = var.enable_openai ? azurerm_cognitive_account.openai[0].endpoint : ""
  description = "Azure OpenAI endpoint, empty when enable_openai = false."
}

output "container_app_url" {
  value       = var.enable_container_apps ? "https://${azurerm_container_app.api[0].latest_revision_fqdn}" : ""
  description = "Public URL of the API container app, empty when enable_container_apps = false."
}

output "static_web_app_default_host" {
  value       = var.enable_static_web_app ? "https://${azurerm_static_web_app.swa[0].default_host_name}" : ""
  description = "Public URL of the Static Web App, empty when enable_static_web_app = false."
}

output "static_web_app_api_key" {
  value       = var.enable_static_web_app ? azurerm_static_web_app.swa[0].api_key : ""
  description = "SWA deployment token consumed by the GitHub Actions deploy workflow."
  sensitive   = true
}
