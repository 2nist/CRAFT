#!/usr/bin/env node

import { execSync, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Building NSIS installer with auto VC++ installation...\n');

try {
  // First ensure we have the unpacked application
  const unpackedPath = path.join(__dirname, 'release', 'win-unpacked');
  const exePath = path.join(unpackedPath, 'Craft Automation CPQ.exe');
  
  if (!fs.existsSync(exePath)) {
    console.error('✗ Unpacked application not found. Run npm run dist:portable first.');
    process.exit(1);
  }

  console.log('✓ Unpacked application found');
  console.log(`  Location: ${unpackedPath}`);
  console.log(`  Size: ${Math.round(fs.statSync(exePath).size / 1024 / 1024)}MB\n`);

  // Check if NSIS is installed
  let nsisPath = null;
  const possibleNsisLocations = [
    'C:\\Program Files\\NSIS\\makensis.exe',
    'C:\\Program Files (x86)\\NSIS\\makensis.exe',
    'C:\\Program Files\\NSIS\\Bin\\makensis.exe',
    'C:\\Program Files (x86)\\NSIS\\Bin\\makensis.exe'
  ];

  for (const location of possibleNsisLocations) {
    if (fs.existsSync(location)) {
      nsisPath = location;
      console.log('✓ NSIS found at:', nsisPath);
      break;
    }
  }

  if (!nsisPath) {
    console.log('\n⚠  NSIS not installed. Installing NSIS via npm...');
    
    try {
      execSync('npm install -g nsis', { stdio: 'inherit' });
      console.log('✓ NSIS installed via npm');
      
      // Try to find it again
      const result = spawnSync('where', ['makensis.exe'], { encoding: 'utf-8' });
      if (result.status === 0) {
        nsisPath = result.stdout.trim().split('\n')[0];
        console.log('✓ NSIS located at:', nsisPath);
      }
    } catch (e) {
      console.log('\n⚠  Could not install NSIS via npm. Falling back to electron-builder.\n');
    }
  }

  if (nsisPath) {
    console.log('\nBuilding installer with NSIS...\n');

    // Run NSIS with the installer.nsi script
    const result = spawnSync(nsisPath, [
      '/V3',  // Verbose output
      'installer.nsi'
    ], {
      cwd: __dirname,
      stdio: 'inherit'
    });

    if (result.status === 0) {
      console.log('\n✓ NSIS installer built successfully!');
      
      // Check for the installer file
      const installerPath = path.join(__dirname, 'release', 'Craft Automation CPQ Setup.exe');
      if (fs.existsSync(installerPath)) {
        const size = fs.statSync(installerPath);
        console.log(`  Installer: ${installerPath}`);
        console.log(`  Size: ${Math.round(size.size / 1024 / 1024)}MB`);
        console.log('\n✓ Ready for distribution!');
        process.exit(0);
      }
    } else {
      console.error('\n✗ NSIS build failed with status:', result.status);
      process.exit(1);
    }
  } else {
    console.log('\nFalling back to electron-builder...');
    
    const result = spawnSync('npx', [
      'electron-builder',
      '--win',
      '--publish=never',
      '-c.win.target=nsis',
      '-c.npmRebuild=false'
    ], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true
    });

    if (result.status === 0) {
      console.log('\n✓ Installer built successfully with electron-builder!');
      
      // Find the installer
      const releaseDir = path.join(__dirname, 'release');
      const files = fs.readdirSync(releaseDir);
      const setupFile = files.find(f => f.endsWith('Setup.exe'));
      
      if (setupFile) {
        const setupPath = path.join(releaseDir, setupFile);
        const size = fs.statSync(setupPath);
        console.log(`  Installer: ${setupPath}`);
        console.log(`  Size: ${Math.round(size.size / 1024 / 1024)}MB`);
        console.log('\n✓ Ready for distribution!');
        process.exit(0);
      }
    } else {
      console.error('\n✗ electron-builder failed');
      process.exit(1);
    }
  }

} catch (error) {
  console.error('Build error:', error.message);
  process.exit(1);
}
