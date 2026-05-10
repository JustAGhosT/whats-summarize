// =============================================================================
// Staging Environment Parameters
// =============================================================================
// Staging mirrors production configuration with reduced capacity for cost
// optimization while maintaining feature parity for pre-production testing.
// =============================================================================
using '../bicep/main.bicep'

param environment = 'staging'
param org = 'nl'
param projectName = 'convolens'
param location = 'eastus'

// Enable services for staging (mirrors production)
// Note: OpenAI disabled - configure Azure AI Foundry separately via Azure Portal
param enableOpenAI = false
param enableCosmosDB = true
param enableRedis = true
param enableContainerApps = true
param enableStaticWebApps = true

// OpenAI deployments (only used if enableOpenAI = true)
// Configure Azure AI Foundry manually and set AZURE_OPENAI_* env vars
param openAIDeployments = []

param adminEmail = 'staging-alerts@convolens.com'

param tags = {
  org: 'nl'
  project: 'convolens'
  environment: 'staging'
  managedBy: 'bicep'
  costCenter: 'staging'
  criticalityLevel: 'medium'
  purpose: 'pre-production-testing'
}
