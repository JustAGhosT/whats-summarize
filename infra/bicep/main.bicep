// =============================================================================
// ConvoLens - Azure Infrastructure (Main Template)
// =============================================================================
// This template deploys all Azure resources required for ConvoLens.
// Use with appropriate parameter files for each environment.
//
// Resources deployed:
// - Azure OpenAI Service (AI Foundry)
// - Azure Cosmos DB (NoSQL database)
// - Azure Blob Storage (file storage)
// - Azure Redis Cache (distributed caching)
// - Azure AD B2C (authentication) - requires manual setup
// - Azure Application Insights (monitoring)
// - Azure Key Vault (secrets management)
// - Azure Container Apps (API hosting)
// - Azure Static Web Apps (frontend hosting)
// - Azure Budget Alerts (cost management)
// =============================================================================

targetScope = 'resourceGroup'

// =============================================================================
// Parameters
// =============================================================================

@description('Environment name (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('Azure region for resources')
param location string = resourceGroup().location

@description('Organisation prefix per NL Azure Naming Standards (ADR-0027 — region suffix dropped from resource names)')
@allowed(['nl', 'pvc', 'tws', 'mys'])
param org string = 'nl'

@description('Project name used for resource naming. Renamed from "whatssummarize" to "convolens" on 2026-05-10 ahead of the GitHub repo transfer + first Azure deploy under the new name. No infra exists under the old name, so this is a clean cutover, not a migration.')
@minLength(3)
@maxLength(15)
param projectName string = 'convolens'

@description('Logical database name used for Cosmos DB (and future Azure SQL). Decoupled from projectName so the brand rename can land without renaming Azure resources. Override at deploy time only when migrating data.')
@minLength(3)
@maxLength(40)
param databaseName string = 'convolens'

@description('Enable Azure OpenAI deployment')
param enableOpenAI bool = true

@description('Enable Cosmos DB deployment')
param enableCosmosDB bool = true

@description('Enable Redis Cache deployment')
param enableRedis bool = true

@description('Enable Container Apps deployment')
param enableContainerApps bool = true

@description('Enable Static Web Apps deployment')
param enableStaticWebApps bool = true

@description('Administrator email for alerts')
param adminEmail string = ''

@description('Enable budget alerts')
param enableBudgetAlerts bool = true

@description('Monthly budget amount in USD')
param monthlyBudgetAmount int = environment == 'prod' ? 500 : environment == 'staging' ? 200 : 100

@description('OpenAI model deployments')
param openAIDeployments array = [
  {
    name: 'gpt-4'
    model: 'gpt-4'
    version: '0613'
    capacity: 10
  }
  {
    name: 'gpt-35-turbo'
    model: 'gpt-35-turbo'
    version: '0613'
    capacity: 30
  }
]

@description('Tags to apply to all resources')
param tags object = {
  org: org
  project: projectName
  environment: environment
  managedBy: 'bicep'
}

// =============================================================================
// Variables
// =============================================================================

// Naming pattern per ADR-0027 (no region suffix):
//   {org}-{env}-{project}-{type}                 e.g. nl-dev-convolens-kv
// Storage Account name constraint (alphanumeric only, max 24 chars) requires
// a hyphen-stripped variant; everything else uses the hyphenated form.
var base = '${org}-${environment}-${projectName}'
var baseAlphanumeric = replace(base, '-', '')

// SKUs based on environment
// Redis: Basic (no SLA) for dev, Standard (SLA) for prod
var redisSku = environment == 'prod' ? 'Standard' : 'Basic'
var redisFamily = environment == 'prod' ? 'C' : 'C'
var redisCapacity = environment == 'prod' ? 1 : 0

// Storage: Standard for dev, Premium for prod (optional)
var storageSkuName = environment == 'prod' ? 'Standard_GRS' : 'Standard_LRS'

// Container Apps: Production uses more resources
var containerAppCpu = environment == 'prod' ? '1.0' : '0.5'
var containerAppMemory = environment == 'prod' ? '2.0Gi' : '1.0Gi'
var containerAppMinReplicas = environment == 'prod' ? 2 : 0
var containerAppMaxReplicas = environment == 'prod' ? 10 : 3

// =============================================================================
// Modules
// =============================================================================

// Key Vault (deployed first for secret management)
module keyVault 'modules/key-vault.bicep' = {
  name: 'keyVault-${environment}'
  params: {
    name: '${base}-kv'
    location: location
    tags: tags
    enableSoftDelete: environment == 'prod'
    enablePurgeProtection: environment == 'prod'
  }
}

// Storage Account
module storage 'modules/storage.bicep' = {
  name: 'storage-${environment}'
  params: {
    name: '${baseAlphanumeric}st'
    location: location
    tags: tags
    sku: storageSkuName
    containerNames: ['chat-exports', 'user-uploads', 'summaries']
    enableVersioning: environment == 'prod'
  }
}

// Azure OpenAI
module openAI 'modules/openai.bicep' = if (enableOpenAI) {
  name: 'openai-${environment}'
  params: {
    name: '${base}-oai'
    location: location // Note: OpenAI has limited region availability
    tags: tags
    deployments: openAIDeployments
    keyVaultName: keyVault.outputs.name
  }
}

// Cosmos DB
module cosmosDB 'modules/cosmos-db.bicep' = if (enableCosmosDB) {
  name: 'cosmosdb-${environment}'
  params: {
    name: '${base}-cosmos'
    location: location
    tags: tags
    databaseName: databaseName
    containers: [
      {
        name: 'users'
        partitionKey: '/id'
      }
      {
        name: 'chats'
        partitionKey: '/userId'
      }
      {
        name: 'summaries'
        partitionKey: '/chatId'
      }
    ]
    keyVaultName: keyVault.outputs.name
  }
}

// Redis Cache
module redis 'modules/redis.bicep' = if (enableRedis) {
  name: 'redis-${environment}'
  params: {
    name: '${base}-redis'
    location: location
    tags: tags
    sku: redisSku
    family: redisFamily
    capacity: redisCapacity
    keyVaultName: keyVault.outputs.name
  }
}

// Application Insights
module appInsights 'modules/app-insights.bicep' = {
  name: 'appinsights-${environment}'
  params: {
    name: '${base}-appi'
    location: location
    tags: tags
  }
}

// Container Apps Environment & API
module containerApps 'modules/container-apps.bicep' = if (enableContainerApps) {
  name: 'containerapps-${environment}'
  params: {
    environmentName: '${base}-cae'
    apiAppName: '${base}-api'
    location: location
    tags: tags
    appInsightsConnectionString: appInsights.outputs.connectionString
    keyVaultName: keyVault.outputs.name
    cosmosDbEndpoint: enableCosmosDB ? cosmosDB.outputs.endpoint : ''
    redisHostname: enableRedis ? redis.outputs.hostname : ''
    storageAccountName: storage.outputs.name
    openAIEndpoint: enableOpenAI ? openAI.outputs.endpoint : ''
    // Environment-specific scaling
    apiCpu: containerAppCpu
    apiMemory: containerAppMemory
    minReplicas: containerAppMinReplicas
    maxReplicas: containerAppMaxReplicas
  }
}

// Static Web Apps (Frontend)
module staticWebApp 'modules/static-web-app.bicep' = if (enableStaticWebApps) {
  name: 'staticwebapp-${environment}'
  params: {
    name: '${base}-swa'
    location: location
    tags: tags
    apiUrl: enableContainerApps ? containerApps.outputs.apiUrl : ''
  }
}

// Budget Alerts (Cost Management)
module budgetAlerts 'modules/budget-alerts.bicep' = if (enableBudgetAlerts && !empty(adminEmail)) {
  name: 'budget-${environment}'
  params: {
    name: '${base}-budget'
    amount: monthlyBudgetAmount
    contactEmails: [adminEmail]
    environment: environment
    tags: tags
  }
}

// =============================================================================
// Outputs
// =============================================================================

output resourceGroupName string = resourceGroup().name
output keyVaultName string = keyVault.outputs.name
output keyVaultUri string = keyVault.outputs.uri
output storageAccountName string = storage.outputs.name
output storageBlobEndpoint string = storage.outputs.blobEndpoint

output openAIEndpoint string = enableOpenAI ? openAI.outputs.endpoint : ''
output openAIDeploymentNames array = enableOpenAI ? openAI.outputs.deploymentNames : []

output cosmosDBEndpoint string = enableCosmosDB ? cosmosDB.outputs.endpoint : ''
output cosmosDBDatabaseName string = enableCosmosDB ? cosmosDB.outputs.databaseName : ''

output redisHostname string = enableRedis ? redis.outputs.hostname : ''
output redisPort int = enableRedis ? redis.outputs.port : 0

output appInsightsConnectionString string = appInsights.outputs.connectionString
output appInsightsInstrumentationKey string = appInsights.outputs.instrumentationKey

output containerAppsApiUrl string = enableContainerApps ? containerApps.outputs.apiUrl : ''
output staticWebAppUrl string = enableStaticWebApps ? staticWebApp.outputs.url : ''
