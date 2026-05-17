env      = "dev"
org      = "nl"
projname = "convolens"
location = "eastus2"

database_name = "convolens"

enable_cosmos         = true
enable_openai         = false
enable_redis          = false
enable_container_apps = true
enable_static_web_app = true
enable_budget_alerts  = false

admin_email           = ""
monthly_budget_amount = 100

container_image_api = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"

tags = {
  costCenter = "development"
}
