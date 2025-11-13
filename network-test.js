// Test network access for packaged vs development app
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

async function testNetworkAccess() {
  console.log('=== Network Access Test ===');
  console.log('Platform:', process.platform);
  console.log('Architecture:', process.arch);
  console.log('Node version:', process.version);
  console.log('Electron:', process.versions.electron || 'N/A');
  console.log('Running in packaged app:', !process.env.NODE_ENV && process.resourcesPath ? 'YES' : 'NO');
  console.log('User:', os.userInfo().username);
  console.log('Working directory:', process.cwd());
  console.log('');

  // Check environment variable
  const envPath = process.env.CRAFT_TOOLS_RUNTIME_ROOT;
  console.log('CRAFT_TOOLS_RUNTIME_ROOT:', envPath || 'NOT SET');

  if (envPath) {
    console.log('Testing network path access...');

    try {
      // Test 1: fs.access
      await fs.access(envPath);
      console.log('✅ fs.access() - SUCCESS');

      // Test 2: fs.stat
      const stats = await fs.stat(envPath);
      console.log('✅ fs.stat() - SUCCESS');
      console.log('   Is directory:', stats.isDirectory());
      console.log('   Permissions:', stats.mode.toString(8));

      // Test 3: fs.readdir (try to list contents)
      try {
        const contents = await fs.readdir(envPath);
        console.log('✅ fs.readdir() - SUCCESS');
        console.log('   Contents count:', contents.length);
        console.log('   First few items:', contents.slice(0, 3).join(', '));
      } catch (readdirErr) {
        console.log('❌ fs.readdir() - FAILED:', readdirErr.message);
      }

      // Test 4: Try to create a test file
      const testFile = path.join(envPath, 'network_test.tmp');
      try {
        await fs.writeFile(testFile, 'test', 'utf8');
        console.log('✅ Write test file - SUCCESS');
        await fs.unlink(testFile);
        console.log('✅ Delete test file - SUCCESS');
      } catch (fileErr) {
        console.log('❌ File operations - FAILED:', fileErr.message);
      }

    } catch (err) {
      console.log('❌ Network access - FAILED');
      console.log('Error:', err.message);
      console.log('Error code:', err.code);
    }
  } else {
    console.log('No environment variable set - using local storage');
  }

  console.log('');
  console.log('=== Test Complete ===');
}

// Run the test
testNetworkAccess().catch(console.error);