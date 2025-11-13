// Network Credentials Test Script
// This script tests the network credential functionality for the Craft Tools Hub

const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createTestWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron', 'preload.cjs')
    }
  });

  // Create test HTML
  const testHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Network Credentials Test</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .test-section { margin: 20px 0; padding: 15px; border: 1px solid #ccc; border-radius: 5px; }
        button { padding: 10px 15px; margin: 5px; cursor: pointer; }
        .result { margin-top: 10px; padding: 10px; background: #f0f0f0; white-space: pre-wrap; }
      </style>
    </head>
    <body>
      <h1>Network Credentials Test</h1>

      <div class="test-section">
        <h3>Test 1: Get Stored Credentials</h3>
        <button onclick="testGetStoredCredentials()">Get Stored Credentials</button>
        <div id="result1" class="result"></div>
      </div>

      <div class="test-section">
        <h3>Test 2: Test Network Connection</h3>
        <input type="text" id="testUsername" placeholder="Username" value="CraftAutoNAS-MatthewP">
        <input type="password" id="testPassword" placeholder="Password">
        <button onclick="testNetworkConnection()">Test Connection</button>
        <div id="result2" class="result"></div>
      </div>

      <div class="test-section">
        <h3>Test 3: Save Credentials</h3>
        <input type="text" id="saveUsername" placeholder="Username" value="CraftAutoNAS-MatthewP">
        <input type="password" id="savePassword" placeholder="Password">
        <button onclick="testSaveCredentials()">Save Credentials</button>
        <div id="result3" class="result"></div>
      </div>

      <div class="test-section">
        <h3>Test 4: Clear Credentials</h3>
        <button onclick="testClearCredentials()">Clear Credentials</button>
        <div id="result4" class="result"></div>
      </div>

      <div class="test-section">
        <h3>Test 5: Enhanced Runtime Status</h3>
        <button onclick="testRuntimeStatus()">Get Runtime Status</button>
        <div id="result5" class="result"></div>
      </div>

      <script>
        async function testGetStoredCredentials() {
          try {
            const result = await window.electronAPI.networkGetStoredCredentials();
            document.getElementById('result1').textContent = JSON.stringify(result, null, 2);
          } catch (error) {
            document.getElementById('result1').textContent = 'Error: ' + error.message;
          }
        }

        async function testNetworkConnection() {
          const username = document.getElementById('testUsername').value;
          const password = document.getElementById('testPassword').value;
          try {
            const result = await window.electronAPI.networkTestCredentials({ username, password });
            document.getElementById('result2').textContent = JSON.stringify(result, null, 2);
          } catch (error) {
            document.getElementById('result2').textContent = 'Error: ' + error.message;
          }
        }

        async function testSaveCredentials() {
          const username = document.getElementById('saveUsername').value;
          const password = document.getElementById('savePassword').value;
          try {
            const result = await window.electronAPI.networkSaveCredentials({ username, password });
            document.getElementById('result3').textContent = JSON.stringify(result, null, 2);
          } catch (error) {
            document.getElementById('result3').textContent = 'Error: ' + error.message;
          }
        }

        async function testClearCredentials() {
          try {
            const result = await window.electronAPI.networkClearCredentials();
            document.getElementById('result4').textContent = JSON.stringify(result, null, 2);
          } catch (error) {
            document.getElementById('result4').textContent = 'Error: ' + error.message;
          }
        }

        async function testRuntimeStatus() {
          try {
            const result = await window.electronAPI.runtimeGetStatusEnhanced();
            document.getElementById('result5').textContent = JSON.stringify(result, null, 2);
          } catch (error) {
            document.getElementById('result5').textContent = 'Error: ' + error.message;
          }
        }
      </script>
    </body>
    </html>
  `;

  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(testHTML));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createTestWindow();

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
});

// Export for use in main process
module.exports = { createTestWindow };