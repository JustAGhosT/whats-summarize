// =============================================================================
// Development Environment Parameters
// =============================================================================
using '../bicep/main.bicep'

param environment = 'dev'
param org = 'nl'
param projectName = 'convolens'
param location = 'eastus'

// Enable services for development
// Note: OpenAI disabled - configure Azure AI Foundry separately via Azure Portal
param enableOpenAI = false
param enableCosmosDB = true
param enableRedis = true
param enableContainerApps = true
param enableStaticWebApps = true

// OpenAI deployments (only used if enableOpenAI = true)
// Configure Azure AI Foundry manually and set AZURE_OPENAI_* env vars
param openAIDeployments = []

param adminEmail = ''

param tags = {
  org: 'nl'
  project: 'convolens'
  environment: 'dev'
  managedBy: 'bicep'
  costCenter: 'development'
}
