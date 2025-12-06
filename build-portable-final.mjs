#!/usr/bin/env node

import { execSync, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Creating portable application package...');

try {
  // Try with portable builder skipping code signing entirely
  const result = spawnSync('npx', [
    'electron-builder',
    '--win',
    '--publish=never',
    '-c.win.target=portable',
    '-c.win.sign=false',
    '-c.win.forceCodeSigning=false',
    '-c.npmRebuild=false'
  ], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  if (result.status !== 0) {
    console.log('\nWarning: electron-builder encountered an issue, but app files may have been created.');
    console.log('Checking for unpacked application directory...\n');
  }

  // Check if unpacked directory was created (even if builder had issues)
  const unpackedPath = path.join(__dirname, 'release', 'win-unpacked');
  const exePath = path.join(unpackedPath, 'Craft Automation CPQ.exe');
  
  if (fs.existsSync(exePath)) {
    const stats = fs.statSync(exePath);
    console.log('✓ Portable application ready!');
    console.log(`  Location: ${unpackedPath}`);
    console.log(`  Executable: Craft Automation CPQ.exe (${Math.round(stats.size / 1024 / 1024)}MB)`);
    console.log(`  Total Files: ${(function() {
      let count = 0;
      function countFiles(dir) {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
          count++;
          const itemPath = path.join(dir, item);
          if (fs.statSync(itemPath).isDirectory()) {
            countFiles(itemPath);
          }
        });
      }
      countFiles(unpackedPath);
      return count;
    })()}`);
    process.exit(0);
  } else {
    console.error('✗ Failed to create portable application');
    process.exit(1);
  }
} catch (error) {
  console.error('Build error:', error.message);
  process.exit(1);
}
