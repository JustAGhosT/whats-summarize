variable "env" {
  type        = string
  description = "Environment name (dev/staging/prod). Drives naming and SKU sizing."
  default     = "dev"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.env)
    error_message = "env must be dev, staging, or prod."
  }
}

variable "org" {
  type        = string
  description = "Organisation prefix per NL Azure Naming Standards (ADR-0027)."
  default     = "nl"
  validation {
    condition     = contains(["nl", "pvc", "tws", "mys"], var.org)
    error_message = "org must be one of nl, pvc, tws, mys."
  }
}

variable "projname" {
  type        = string
  description = "Project name used for resource naming."
  default     = "convolens"
  validation {
    condition     = length(var.projname) >= 3 && length(var.projname) <= 15
    error_message = "projname must be 3-15 characters."
  }
}

variable "location" {
  type        = string
  description = "Primary Azure region for resources."
  default     = "eastus2"
}

variable "database_name" {
  type        = string
  description = "Cosmos DB SQL database name. Decoupled from projname so brand renames don't force data migration."
  default     = "convolens"
}

variable "enable_cosmos" {
  type        = bool
  description = "Provision Cosmos DB account, database, and containers."
  default     = true
}

variable "enable_openai" {
  type        = bool
  description = "Provision Azure OpenAI account. Disabled in dev because Azure AI Foundry is configured separately."
  default     = false
}

variable "enable_redis" {
  type        = bool
  description = "Provision Azure Cache for Redis. Off by default in dev to avoid the Basic-tier Redis cost (~$15-30/mo)."
  default     = false
}

variable "enable_container_apps" {
  type        = bool
  description = "Provision Container Apps Environment + API Container App."
  default     = true
}

variable "enable_static_web_app" {
  type        = bool
  description = "Provision Static Web App for the frontend."
  default     = true
}

variable "enable_budget_alerts" {
  type        = bool
  description = "Provision a resource-group-scoped consumption budget. Skipped automatically when admin_email is empty."
  default     = true
}

variable "admin_email" {
  type        = string
  description = "Email address that receives budget alerts. Empty disables budget alerts regardless of enable_budget_alerts."
  default     = ""
}

variable "monthly_budget_amount" {
  type        = number
  description = "Monthly budget in USD."
  default     = 100
}

variable "container_image_api" {
  type        = string
  description = "Image for the API Container App. Defaults to the Microsoft helloworld placeholder; the API CD pipeline overrides this."
  default     = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
}

variable "tags" {
  type        = map(string)
  description = "Additional tags merged with the org/project/env defaults."
  default = {
    costCenter = "development"
  }
}
