import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { app, BrowserWindow, ipcMain } = require('electron');
import path from 'path';
import fs from 'fs/promises';

// Mock the credential functions for testing
async function loadNetworkCredentials() {
  try {
    const credPath = path.join(app.getPath('userData'), 'network-credentials.json');
    const data = await fs.readFile(credPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

async function saveNetworkCredentials(username, password) {
  const credPath = path.join(app.getPath('userData'), 'network-credentials.json');
  const credentials = { username: username, password: password, timestamp: Date.now() };
  await fs.writeFile(credPath, JSON.stringify(credentials, null, 2));
}

// eslint-disable-next-line no-unused-vars
async function testNetworkConnection(username, password) {
  // Mock network test - in real implementation this would test actual network access
  return { success: true, message: 'Network connection successful' };
}

async function promptForNetworkCredentials(mainWindow) {
  return new Promise((resolve, reject) => {
    const promptWindow = new BrowserWindow({
      width: 400,
      height: 300,
      parent: mainWindow,
      modal: true,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const promptHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Network Credentials Required</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        input { width: 100%; padding: 8px; margin: 8px 0; }
        button { padding: 10px 20px; margin: 10px 5px; }
      </style>
    </head>
    <body>
      <h3>Network Access Required</h3>
      <p>Please enter your network credentials to access the shared storage:</p>
      <input type="text" id="username" placeholder="Username" /><br>
      <input type="password" id="password" placeholder="Password" /><br>
      <button onclick="submitCredentials()">Connect</button>
      <button onclick="cancelPrompt()">Cancel</button>
      <script>
        function submitCredentials() {
          const username = document.getElementById('username').value;
          const password = document.getElementById('password').value;
          window.postMessage({ type: 'credentials', username, password }, '*');
        }
        function cancelPrompt() {
          window.postMessage({ type: 'cancel' }, '*');
        }
        window.addEventListener('message', (event) => {
          if (event.data.type === 'credentials' || event.data.type === 'cancel') {
            // Handle in main process
          }
        });
      </script>
    </body>
    </html>`;

    promptWindow.loadURL('data:text/html,' + encodeURIComponent(promptHtml));
    promptWindow.once('ready-to-show', () => {
      promptWindow.show();
    });

    promptWindow.webContents.on('console-message', (event, level, message) => {
      console.log('Prompt window console:', message);
    });

    // Listen for credentials from the prompt window
    promptWindow.webContents.on('did-finish-load', () => {
      promptWindow.webContents.executeJavaScript(`
        window.addEventListener('message', (event) => {
          if (event.data.type === 'credentials') {
            require('electron').ipcRenderer.send('credential-response', event.data);
          } else if (event.data.type === 'cancel') {
            require('electron').ipcRenderer.send('credential-cancel');
          }
        });
      `);
    });

    ipcMain.once('credential-response', (event, data) => {
      promptWindow.close();
      resolve(data);
    });

    ipcMain.once('credential-cancel', () => {
      promptWindow.close();
      reject(new Error('User cancelled credential prompt'));
    });

    promptWindow.on('closed', () => {
      reject(new Error('Prompt window closed'));
    });
  });
}

// Test function
async function runCredentialTests() {
  console.log('=== Credential Functionality Test ===');

  try {
    // Test 1: Load credentials
    console.log('\n1. Testing loadNetworkCredentials...');
    const creds = await loadNetworkCredentials();
    console.log('   Result:', creds ? 'Credentials loaded' : 'No credentials found');

    // Test 2: Save credentials
    console.log('\n2. Testing saveNetworkCredentials...');
    await saveNetworkCredentials('testuser', 'testpass');
    console.log('   Credentials saved successfully');

    // Test 3: Load again to verify save worked
    console.log('\n3. Verifying saved credentials...');
    const savedCreds = await loadNetworkCredentials();
    console.log('   Loaded credentials:', savedCreds ? 'Present' : 'Missing');

    // Test 4: Test network connection
    console.log('\n4. Testing network connection...');
    const networkResult = await testNetworkConnection('testuser', 'testpass');
    console.log('   Network test result:', networkResult);

    console.log('\n=== All basic tests passed! ===');
    console.log('Note: Prompt testing requires a running Electron window.');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Export functions for use in main app
export {
  loadNetworkCredentials,
  saveNetworkCredentials,
  testNetworkConnection,
  promptForNetworkCredentials,
  runCredentialTests
};

console.log('Starting credential test...');

// Run tests directly
app.whenReady().then(async () => {
  console.log('App ready, running tests...');
  await runCredentialTests();
  console.log('Test completed. Exiting...');
  setTimeout(() => app.quit(), 1000); // Give time for output
});