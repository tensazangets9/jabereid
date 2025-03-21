# Deploying to Azure

This document outlines the steps to deploy this React application to Azure Web App.

## Prerequisites

1. **Azure Account**: You need an active Azure subscription.
2. **Azure CLI**: Install the [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) to deploy from your local machine.
3. **Azure Web App**: Create a Web App in Azure configured for static site hosting or Node.js.

## Deployment Methods

### Method 1: Using Azure Portal

1. Build the application:
   ```
   npm run build
   ```

2. Copy `web.config` to the `dist` folder.

3. Zip the contents of the `dist` directory.

4. In the Azure Portal, navigate to your Web App, go to "Deployment Center", and upload the zip file.

### Method 2: Using Azure CLI

1. Log in to Azure:
   ```
   az login
   ```

2. Build the application:
   ```
   npm run build
   ```

3. Edit the `deploy.sh` (Linux/Mac) or `deploy.ps1` (Windows) script and add your Resource Group name and Web App name.

4. Run the deployment script:
   ```
   # For Linux/Mac
   bash deploy.sh
   
   # For Windows PowerShell
   .\deploy.ps1
   ```

### Method 3: Using GitHub Actions (CI/CD)

1. Push your code to a GitHub repository.

2. In the Azure Portal, go to your Web App > Deployment Center > GitHub Actions.

3. Configure CI/CD by connecting to your GitHub repository.

4. Azure will automatically create the necessary GitHub workflow files for you.

## Application Settings

If your application requires any environment variables, set them in the Azure Portal:

1. Go to Web App > Configuration > Application settings
2. Add any required environment variables here

## Troubleshooting

- If you encounter routing issues, verify that the `web.config` file is correctly included in your deployment.
- For CORS issues, configure CORS settings in your Azure Web App.
- Check Web App logs to debug deployment or runtime issues.

## Azure Resources

- [Azure Static Web Apps documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Azure Web Apps documentation](https://docs.microsoft.com/en-us/azure/app-service/) 