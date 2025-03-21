# Deployment script for Azure Web App
# Make sure to install Azure CLI and log in before running this script
# Run: az login

# Variables - Replace these with your values
$resourceGroupName = "YOUR_RESOURCE_GROUP"
$webAppName = "YOUR_WEB_APP_NAME"

# Copy web.config to dist folder
Copy-Item -Path "web.config" -Destination "dist/web.config"

# Deploy to Azure Web App
Write-Host "Deploying to Azure Web App: $webAppName..."
az webapp deployment source config-zip --resource-group $resourceGroupName --name $webAppName --src dist.zip

Write-Host "Deployment complete!" 