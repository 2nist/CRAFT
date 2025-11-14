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

  // Create runtime config file with NAS path in the resources directory
  const resourcesDir = path.join(appDir, 'resources');
  const configPath = path.join(resourcesDir, 'runtime-config.json');
  const nasPath = process.env.BUILD_NAS_PATH || '\\\\192.168.1.99\\CraftAuto-Sales';

  const configContent = JSON.stringify({
    runtimeRoot: nasPath,
    version: require('../package.json').version,
    buildDate: new Date().toISOString(),
    description: 'NAS runtime configuration for Craft Tools Hub'
  }, null, 2);

  try {
    // Ensure resources directory exists
    if (!fs.existsSync(resourcesDir)) {
      fs.mkdirSync(resourcesDir, { recursive: true });
    }
    fs.writeFileSync(configPath, configContent);
    console.log(`Created runtime config with NAS path: ${nasPath}`);
  } catch (error) {
    console.error('Failed to create runtime config file:', error);
  }
}