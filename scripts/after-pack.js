const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  // Only modify for production builds
  if (context.electronPlatformName !== 'win32' || !context.appOutDir) {
    return;
  }

  console.log('Setting production environment variables...');

  // Path to the main executable or app directory
  const appDir = context.appOutDir;

  // Create or modify a .env file in the app directory
  const envPath = path.join(appDir, '.env');
  const envContent = 'DISABLE_BUNDLED_SUBASSEMBLIES=true\nNODE_ENV=production\n';

  try {
    fs.writeFileSync(envPath, envContent);
    console.log('Created .env file with production settings');
  } catch (error) {
    console.error('Failed to create .env file:', error);
  }
};