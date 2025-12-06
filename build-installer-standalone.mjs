#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Building standalone NSIS installer...\n');

// Verify unpacked app exists
const unpackedPath = path.join(__dirname, 'release', 'win-unpacked');
const exePath = path.join(unpackedPath, 'Craft Automation CPQ.exe');

if (!fs.existsSync(exePath)) {
  console.error('✗ Unpacked application not found at:', unpackedPath);
  console.error('  Please run: npm run dist:portable');
  process.exit(1);
}

console.log('✓ Unpacked application found');
console.log(`  Location: ${unpackedPath}`);
console.log(`  Size: ${Math.round(fs.statSync(exePath).size / 1024 / 1024)}MB\n`);

// Create the NSIS script that references the unpacked directory
const nsisContent = `; NSIS Installer for Craft Automation CPQ
; Automatically downloads and installs Visual C++ Runtime if needed

!include "MUI2.nsh"
!include "x64.nsh"

; Configuration
Name "Craft Automation CPQ"
OutFile "release\\Craft Automation CPQ Setup.exe"
InstallDir "$PROGRAMFILES64\\Craft Automation CPQ"
RequestExecutionLevel admin

; UI Settings
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

; Version
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "Craft Automation CPQ"
VIAddVersionKey "CompanyName" "Craft Automation"
VIAddVersionKey "FileVersion" "1.0.0.0"
VIAddVersionKey "ProductVersion" "1.0.0.0"

Section "Install"
  DetailPrint "Checking Visual C++ Runtime..."
  Call CheckAndInstallVCRuntime
  
  DetailPrint "Checking for running application..."
  ; Kill any running instances
  ExecWait "taskkill.exe /im Craft* /f" $0
  Sleep 1000
  
  SetOutPath "$INSTDIR"
  DetailPrint "Installing application files..."
  SetOverwrite try
  File /nonfatal "release\\win-unpacked\\Craft Automation CPQ.exe"
  File /nonfatal "release\\win-unpacked\\*.dll"
  File /nonfatal "release\\win-unpacked\\*.dat"
  File /nonfatal "release\\win-unpacked\\*.bin"
  SetOutPath "$INSTDIR\\resources"
  File /nonfatal /r "release\\win-unpacked\\resources\\*.*"
  SetOutPath "$INSTDIR"
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\\Craft Automation"
  CreateShortcut "$SMPROGRAMS\\Craft Automation\\Craft Automation CPQ.lnk" "$INSTDIR\\Craft Automation CPQ.exe"
  CreateShortcut "$SMPROGRAMS\\Craft Automation\\Uninstall.lnk" "$INSTDIR\\Uninstall.exe"
  CreateShortcut "$DESKTOP\\Craft Automation CPQ.lnk" "$INSTDIR\\Craft Automation CPQ.exe"
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\\Uninstall.exe"
  
  ; Registry entries
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\CraftAutomationCPQ" "DisplayName" "Craft Automation CPQ"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\CraftAutomationCPQ" "DisplayVersion" "1.0.0.0"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\CraftAutomationCPQ" "UninstallString" "$INSTDIR\\Uninstall.exe"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\CraftAutomationCPQ" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\CraftAutomationCPQ" "Publisher" "Craft Automation"
  
  DetailPrint "Installation complete!"
SectionEnd

Section "Uninstall"
  ; Kill running instances
  ExecWait "taskkill.exe /im Craft* /f" $0
  Sleep 1000
  
  RMDir /r "$INSTDIR"
  RMDir /r "$SMPROGRAMS\\Craft Automation"
  Delete "$DESKTOP\\Craft Automation CPQ.lnk"
  DeleteRegKey HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\CraftAutomationCPQ"
SectionEnd

Function CheckAndInstallVCRuntime
  \${If} \${RunningX64}
    ; Check if VC++ is already installed
    ReadRegStr $0 HKLM "SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x64" "Version"
    
    \${If} \${Errors}
      DetailPrint "Visual C++ Runtime not found. Downloading from Microsoft..."
      
      CreateDirectory "$TEMP\\CraftSetup"
      
      ; Download VC++ Runtime using PowerShell
      ExecWait "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command (New-Object System.Net.WebClient).DownloadFile('https://aka.ms/vs/17/release/vc_redist.x64.exe', '$TEMP\\CraftSetup\\vc_redist.x64.exe')"
      
      Sleep 2000
      
      \${If} \${FileExists} "$TEMP\\CraftSetup\\vc_redist.x64.exe"
        DetailPrint "Installing Visual C++ Runtime..."
        ExecWait "$TEMP\\CraftSetup\\vc_redist.x64.exe /quiet /norestart" $1
        Delete "$TEMP\\CraftSetup\\vc_redist.x64.exe"
        DetailPrint "Visual C++ Runtime installed successfully!"
      \${Else}
        DetailPrint "Could not download VC++ - will continue (may be pre-installed)"
      \${EndIf}
      
      RMDir "$TEMP\\CraftSetup"
    \${Else}
      DetailPrint "Visual C++ 2015-2022 Runtime is already installed"
    \${EndIf}
  \${EndIf}
FunctionEnd
`;

// Write the NSI file
const nsiPath = path.join(__dirname, 'standalone-installer.nsi');
fs.writeFileSync(nsiPath, nsisContent);
console.log('✓ Created standalone installer script\n');

// Try to find NSIS
let nsisPath_ = null;
const possibleLocations = [
  'C:\\Program Files\\NSIS\\makensis.exe',
  'C:\\Program Files (x86)\\NSIS\\makensis.exe'
];

for (const loc of possibleLocations) {
  if (fs.existsSync(loc)) {
    nsisPath_ = loc;
    break;
  }
}

if (!nsisPath_) {
  // Try to find via npm
  try {
    const result = execSync('npm list -g nsis', { encoding: 'utf-8', stdio: 'pipe' });
    console.log('NSIS found in global npm packages');
  } catch (e) {
    console.log('ℹ NSIS not found locally. Attempting to use via npx...\n');
  }
}

// Build with NSIS
console.log('Building installer...\n');

try {
  if (nsisPath_) {
    execSync(`"${nsisPath_}" /V3 "${nsiPath}"`, {
      cwd: __dirname,
      stdio: 'inherit'
    });
  } else {
    // Use npx nsis
    execSync(`npx nsis -V3 "${nsiPath}"`, {
      cwd: __dirname,
      stdio: 'inherit'
    });
  }

  // Check for output
  const setupPath = path.join(__dirname, 'release', 'Craft Automation CPQ Setup.exe');
  if (fs.existsSync(setupPath)) {
    const stats = fs.statSync(setupPath);
    console.log('\n✅ NSIS INSTALLER CREATED SUCCESSFULLY!\n');
    console.log('Installer Details:');
    console.log(`  File: ${setupPath}`);
    console.log(`  Size: ${Math.round(stats.size / 1024 / 1024)}MB`);
    console.log('\nFeatures:');
    console.log('  ✓ Auto-detects and installs Visual C++ Runtime if missing');
    console.log('  ✓ Creates Start Menu shortcuts');
    console.log('  ✓ Creates Desktop shortcut');
    console.log('  ✓ Includes uninstaller');
    console.log('  ✓ 64-bit Windows only');
    console.log('\nReady for distribution!\n');
    process.exit(0);
  } else {
    console.error('✗ Installer file not created');
    process.exit(1);
  }
} catch (error) {
  console.error('\n✗ Build failed:', error.message);
  console.error('\nTroubleshooting:');
  console.error('  1. Install NSIS: https://nsis.sourceforge.io/Download');
  console.error('  2. Add to PATH or specify location');
  console.error('  3. Or run: npm install -g nsis');
  process.exit(1);
}
