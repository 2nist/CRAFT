#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Override home to use local cache directory
const cacheDir = path.join(__dirname, '.eb-cache');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

// Set environment to use local cache
process.env.ELECTRON_BUILDER_CACHE = cacheDir;
process.env.USERPROFILE = __dirname;

console.log('Building portable .exe...');
console.log(`Cache directory: ${cacheDir}`);

try {
  // Run electron-builder with portable target and no code signing
  execSync('npx electron-builder --win --publish=never -c.win.target=portable -c.win.sign=false -c.win.forceCodeSigning=false', {
    cwd: __dirname,
    stdio: 'inherit',
    env: {
      ...process.env,
      ELECTRON_BUILDER_CACHE: cacheDir,
      HOME: cacheDir,
      USERPROFILE: __dirname
    }
  });
  
  console.log('\n✓ Portable .exe build completed successfully!');
  console.log(`Output directory: ${path.join(__dirname, 'release')}`);
  process.exit(0);
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
