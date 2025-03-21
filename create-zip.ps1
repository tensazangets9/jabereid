# Prepare the dist folder for deployment
# Copy web.config to dist folder
Write-Host "Copying web.config to dist folder..."
Copy-Item -Path "web.config" -Destination "dist/web.config"

# Create zip file from dist folder
Write-Host "Creating deployment package..."
$compress = @{
  Path = "dist\*"
  CompressionLevel = "Optimal"
  DestinationPath = "dist.zip"
}
Compress-Archive @compress -Force

Write-Host "Deployment package created: dist.zip"
Write-Host "You can now deploy this zip file to Azure Web App." 