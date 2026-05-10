// =============================================================================
// Production Environment Parameters
// =============================================================================
using '../bicep/main.bicep'

param environment = 'prod'
param org = 'nl'
param projectName = 'convolens'
param location = 'eastus'

// Enable services for production
// Note: OpenAI disabled - configure Azure AI Foundry separately via Azure Portal
param enableOpenAI = false
param enableCosmosDB = true
param enableRedis = true
param enableContainerApps = true
param enableStaticWebApps = true

// OpenAI deployments (only used if enableOpenAI = true)
// Configure Azure AI Foundry manually and set AZURE_OPENAI_* env vars
param openAIDeployments = []

param adminEmail = 'admin@convolens.com'

param tags = {
  org: 'nl'
  project: 'convolens'
  environment: 'prod'
  managedBy: 'bicep'
  costCenter: 'production'
  criticalityLevel: 'high'
}
