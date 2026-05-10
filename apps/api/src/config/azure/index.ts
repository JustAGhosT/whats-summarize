/**
 * Azure Services Configuration
 *
 * Provides unified configuration for Azure cloud services as alternatives
 * to the default providers (Supabase, local SQLite, etc.)
 *
 * Supported Azure Services:
 * - Azure AI Foundry (Azure OpenAI) - AI/ML capabilities
 * - Azure Cosmos DB - NoSQL database
 * - Azure SQL Database - Relational database
 * - Azure Blob Storage - File storage
 * - Azure AD B2C - Authentication
 * - Azure Redis Cache - Caching
 * - Azure Application Insights - Monitoring
 *
 * Usage:
 * Set AZURE_PROVIDER_ENABLED=true to enable Azure services.
 * Configure individual services with their respective environment variables.
 */

import { logger } from '../../utils/logger';

// =============================================================================
// Types
// =============================================================================

export interface AzureConfig {
  enabled: boolean;
  tenantId?: string;
  subscriptionId?: string;
}

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  apiVersion: string;
}

export interface AzureCosmosDBConfig {
  endpoint: string;
  key: string;
  databaseName: string;
  containerName: string;
}

export interface AzureSQLConfig {
  server: string;
  database: string;
  username: string;
  password: string;
  encrypt: boolean;
}

export interface AzureBlobStorageConfig {
  accountName: string;
  accountKey?: string;
  connectionString?: string;
  containerName: string;
  sasToken?: string;
}

export interface AzureADB2CConfig {
  tenantName: string;
  tenantId: string;
  clientId: string;
  clientSecret?: string;
  policyName: string;
  redirectUri: string;
  scopes: string[];
}

export interface AzureRedisConfig {
  hostname: string;
  port: number;
  password: string;
  useTLS: boolean;
}

export interface AzureAppInsightsConfig {
  connectionString: string;
  instrumentationKey: string;
}

// =============================================================================
// Configuration Loaders
// =============================================================================

/**
 * Load base Azure configuration
 */
export function getAzureConfig(): AzureConfig {
  return {
    enabled: process.env.AZURE_PROVIDER_ENABLED === 'true',
    tenantId: process.env.AZURE_TENANT_ID,
    subscriptionId: process.env.AZURE_SUBSCRIPTION_ID,
  };
}

/**
 * Load Azure OpenAI configuration
 */
export function getAzureOpenAIConfig(): AzureOpenAIConfig | null {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;

  if (!endpoint || !apiKey) {
    return null;
  }

  return {
    endpoint,
    apiKey,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
  };
}

/**
 * Load Azure Cosmos DB configuration
 */
export function getAzureCosmosDBConfig(): AzureCosmosDBConfig | null {
  const endpoint = process.env.AZURE_COSMOS_ENDPOINT;
  const key = process.env.AZURE_COSMOS_KEY;

  if (!endpoint || !key) {
    return null;
  }

  return {
    endpoint,
    key,
    databaseName: process.env.AZURE_COSMOS_DATABASE || 'convolens',
    containerName: process.env.AZURE_COSMOS_CONTAINER || 'chats',
  };
}

/**
 * Load Azure SQL configuration
 */
export function getAzureSQLConfig(): AzureSQLConfig | null {
  const server = process.env.AZURE_SQL_SERVER;
  const database = process.env.AZURE_SQL_DATABASE;
  const username = process.env.AZURE_SQL_USERNAME;
  const password = process.env.AZURE_SQL_PASSWORD;

  if (!server || !database || !username || !password) {
    return null;
  }

  return {
    server,
    database,
    username,
    password,
    encrypt: process.env.AZURE_SQL_ENCRYPT !== 'false',
  };
}

/**
 * Load Azure Blob Storage configuration
 */
export function getAzureBlobStorageConfig(): AzureBlobStorageConfig | null {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

  if (!accountName && !connectionString) {
    return null;
  }

  return {
    accountName: accountName || '',
    accountKey,
    connectionString,
    containerName: process.env.AZURE_STORAGE_CONTAINER || 'chat-exports',
    sasToken: process.env.AZURE_STORAGE_SAS_TOKEN,
  };
}

/**
 * Load Azure AD B2C configuration
 */
export function getAzureADB2CConfig(): AzureADB2CConfig | null {
  const tenantName = process.env.AZURE_AD_B2C_TENANT_NAME;
  const tenantId = process.env.AZURE_AD_B2C_TENANT_ID;
  const clientId = process.env.AZURE_AD_B2C_CLIENT_ID;

  if (!tenantName || !tenantId || !clientId) {
    return null;
  }

  return {
    tenantName,
    tenantId,
    clientId,
    clientSecret: process.env.AZURE_AD_B2C_CLIENT_SECRET,
    policyName: process.env.AZURE_AD_B2C_POLICY_NAME || 'B2C_1_signupsignin',
    redirectUri: process.env.AZURE_AD_B2C_REDIRECT_URI || 'http://localhost:3000/auth/callback',
    scopes: (process.env.AZURE_AD_B2C_SCOPES || 'openid,profile,email').split(','),
  };
}

/**
 * Load Azure Redis Cache configuration
 */
export function getAzureRedisConfig(): AzureRedisConfig | null {
  const hostname = process.env.AZURE_REDIS_HOSTNAME;
  const password = process.env.AZURE_REDIS_PASSWORD;

  if (!hostname || !password) {
    return null;
  }

  return {
    hostname,
    port: parseInt(process.env.AZURE_REDIS_PORT || '6380', 10),
    password,
    useTLS: process.env.AZURE_REDIS_TLS !== 'false',
  };
}

/**
 * Load Azure Application Insights configuration
 */
export function getAzureAppInsightsConfig(): AzureAppInsightsConfig | null {
  const connectionString = process.env.AZURE_APP_INSIGHTS_CONNECTION_STRING;
  const instrumentationKey = process.env.AZURE_APP_INSIGHTS_INSTRUMENTATION_KEY;

  if (!connectionString && !instrumentationKey) {
    return null;
  }

  return {
    connectionString: connectionString || '',
    instrumentationKey: instrumentationKey || '',
  };
}

// =============================================================================
// Provider Selection Helpers
// =============================================================================

export type DatabaseProvider = 'sqlite' | 'postgres' | 'azure-cosmos' | 'azure-sql';
export type AuthProvider = 'local' | 'supabase' | 'azure-ad-b2c';
export type StorageProvider = 'local' | 'aws-s3' | 'azure-blob';
export type CacheProvider = 'memory' | 'redis' | 'azure-redis';
export type AIProvider = 'mock' | 'openai' | 'anthropic' | 'azure';

/**
 * Determine the active database provider
 */
export function getDatabaseProvider(): DatabaseProvider {
  const azureConfig = getAzureConfig();

  if (azureConfig.enabled) {
    if (getAzureCosmosDBConfig()) return 'azure-cosmos';
    if (getAzureSQLConfig()) return 'azure-sql';
  }

  if (process.env.DB_TYPE === 'postgres') return 'postgres';

  return 'sqlite';
}

/**
 * Determine the active auth provider
 */
export function getAuthProvider(): AuthProvider {
  const azureConfig = getAzureConfig();

  if (azureConfig.enabled && getAzureADB2CConfig()) {
    return 'azure-ad-b2c';
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return 'supabase';
  }

  return 'local';
}

/**
 * Determine the active storage provider
 */
export function getStorageProvider(): StorageProvider {
  const azureConfig = getAzureConfig();

  if (azureConfig.enabled && getAzureBlobStorageConfig()) {
    return 'azure-blob';
  }

  if (process.env.AWS_S3_BUCKET) {
    return 'aws-s3';
  }

  return 'local';
}

/**
 * Determine the active cache provider
 */
export function getCacheProvider(): CacheProvider {
  const azureConfig = getAzureConfig();

  if (azureConfig.enabled && getAzureRedisConfig()) {
    return 'azure-redis';
  }

  if (process.env.REDIS_URL) {
    return 'redis';
  }

  return 'memory';
}

/**
 * Determine the active AI provider
 */
export function getAIProvider(): AIProvider {
  if (getAzureOpenAIConfig()) return 'azure';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return 'mock';
}

// =============================================================================
// Initialization & Logging
// =============================================================================

/**
 * Log active Azure configuration (safe for logging, no secrets)
 */
export function logAzureConfiguration(): void {
  const config = getAzureConfig();

  if (!config.enabled) {
    logger.info('[Azure] Azure providers disabled');
    return;
  }

  logger.info('[Azure] Azure providers enabled');
  logger.info(`[Azure] Tenant ID: ${config.tenantId ? '***configured***' : 'not set'}`);

  // Log individual service configurations
  const services = {
    'Azure OpenAI': getAzureOpenAIConfig(),
    'Azure Cosmos DB': getAzureCosmosDBConfig(),
    'Azure SQL': getAzureSQLConfig(),
    'Azure Blob Storage': getAzureBlobStorageConfig(),
    'Azure AD B2C': getAzureADB2CConfig(),
    'Azure Redis': getAzureRedisConfig(),
    'Azure App Insights': getAzureAppInsightsConfig(),
  };

  Object.entries(services).forEach(([name, config]) => {
    const status = config ? 'configured' : 'not configured';
    logger.info(`[Azure] ${name}: ${status}`);
  });

  // Log selected providers
  logger.info(`[Azure] Active Providers:`);
  logger.info(`[Azure]   Database: ${getDatabaseProvider()}`);
  logger.info(`[Azure]   Auth: ${getAuthProvider()}`);
  logger.info(`[Azure]   Storage: ${getStorageProvider()}`);
  logger.info(`[Azure]   Cache: ${getCacheProvider()}`);
  logger.info(`[Azure]   AI: ${getAIProvider()}`);
}

/**
 * Validate Azure configuration
 */
export function validateAzureConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = getAzureConfig();

  if (!config.enabled) {
    return { valid: true, errors: [] };
  }

  // Validate Azure OpenAI if partially configured
  const openAI = process.env.AZURE_OPENAI_ENDPOINT || process.env.AZURE_OPENAI_API_KEY;
  if (openAI && !getAzureOpenAIConfig()) {
    errors.push('Azure OpenAI: Both AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY are required');
  }

  // Validate Cosmos DB if partially configured
  const cosmos = process.env.AZURE_COSMOS_ENDPOINT || process.env.AZURE_COSMOS_KEY;
  if (cosmos && !getAzureCosmosDBConfig()) {
    errors.push('Azure Cosmos DB: Both AZURE_COSMOS_ENDPOINT and AZURE_COSMOS_KEY are required');
  }

  // Validate AD B2C if partially configured
  const adb2c = process.env.AZURE_AD_B2C_TENANT_NAME || process.env.AZURE_AD_B2C_CLIENT_ID;
  if (adb2c && !getAzureADB2CConfig()) {
    errors.push('Azure AD B2C: TENANT_NAME, TENANT_ID, and CLIENT_ID are all required');
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// Export all
// =============================================================================

export const azure = {
  getConfig: getAzureConfig,
  getOpenAIConfig: getAzureOpenAIConfig,
  getCosmosDBConfig: getAzureCosmosDBConfig,
  getSQLConfig: getAzureSQLConfig,
  getBlobStorageConfig: getAzureBlobStorageConfig,
  getADB2CConfig: getAzureADB2CConfig,
  getRedisConfig: getAzureRedisConfig,
  getAppInsightsConfig: getAzureAppInsightsConfig,
  getDatabaseProvider,
  getAuthProvider,
  getStorageProvider,
  getCacheProvider,
  getAIProvider,
  logConfiguration: logAzureConfiguration,
  validate: validateAzureConfig,
};

export default azure;
