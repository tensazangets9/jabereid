#!/bin/bash

# Deployment script for Azure Web App
# Make sure to install Azure CLI and log in before running this script
# Run: az login

# Variables - Replace these with your values
RESOURCE_GROUP="YOUR_RESOURCE_GROUP"
WEB_APP_NAME="YOUR_WEB_APP_NAME"

# Copy web.config to dist folder
cp web.config dist/

# Create a zip file of the dist directory
echo "Creating deployment package..."
cd dist && zip -r ../dist.zip * && cd ..

# Deploy to Azure Web App
echo "Deploying to Azure Web App: $WEB_APP_NAME..."
az webapp deployment source config-zip --resource-group $RESOURCE_GROUP --name $WEB_APP_NAME --src dist.zip

echo "Deployment complete!" 