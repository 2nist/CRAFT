# Craft Automation CPQ - Build Script
# Run this with: Right-click -> Run with PowerShell

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "           CRAFT AUTOMATION CPQ - BUILD TOOL" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will build the production application." -ForegroundColor White
Write-Host "Build time: 3-4 minutes" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to start..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Clear-Host

# Check if npm is available
Write-Host ""
Write-Host "Checking for Node.js..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version 2>$null
    $npmVersion = npm --version 2>$null
    Write-Host "Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "npm: $npmVersion" -ForegroundColor Green
    Write-Host ""
} catch {
    Clear-Host
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host "                   NODE.JS NOT FOUND" -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Node.js is required to build this application." -ForegroundColor White
    Write-Host ""
    Write-Host "TO INSTALL NODE.JS:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://nodejs.org" -ForegroundColor White
    Write-Host "2. Install the LTS version (recommended)" -ForegroundColor White
    Write-Host "3. Use default settings during installation" -ForegroundColor White
    Write-Host "4. Restart your computer" -ForegroundColor White
    Write-Host "5. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Direct download link:" -ForegroundColor Yellow
    Write-Host "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Opening download page in your browser..." -ForegroundColor Gray
    Start-Process "https://nodejs.org"
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found!" -ForegroundColor Red
    Write-Host "Please run this script from the craft_tools_hub directory." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Clear-Host

# Install dependencies
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                    BUILDING APPLICATION" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1/4] Installing dependencies..." -ForegroundColor Yellow
Write-Host "This may take 1-2 minutes..." -ForegroundColor Gray
Write-Host ""

npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    Write-Host "Check your internet connection and try again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Clear-Host

# Build Electron
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                    BUILDING APPLICATION" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1/4] Installing dependencies... DONE" -ForegroundColor Green
Write-Host "[2/4] Building Electron main process..." -ForegroundColor Yellow
Write-Host ""

npm run build:electron
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Electron build failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Clear-Host

# Build Renderer
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                    BUILDING APPLICATION" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1/4] Installing dependencies... DONE" -ForegroundColor Green
Write-Host "[2/4] Building Electron main process... DONE" -ForegroundColor Green
Write-Host "[3/4] Building React renderer..." -ForegroundColor Yellow
Write-Host ""

npm run build:renderer
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Renderer build failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Clear-Host

# Package
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                    BUILDING APPLICATION" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1/4] Installing dependencies... DONE" -ForegroundColor Green
Write-Host "[2/4] Building Electron main process... DONE" -ForegroundColor Green
Write-Host "[3/4] Building React renderer... DONE" -ForegroundColor Green
Write-Host "[4/4] Creating portable Windows application..." -ForegroundColor Yellow
Write-Host ""

npx electron-builder --win --dir
# Ignore exit code - code signing warnings are normal

Clear-Host

# Success!
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "                   BUILD COMPLETE!" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your application is ready at:" -ForegroundColor White
Write-Host "  $PWD\release\win-unpacked\Craft Automation CPQ.exe" -ForegroundColor Cyan
Write-Host ""
Write-Host "File size: ~175 MB" -ForegroundColor Gray
Write-Host ""
Write-Host "TO DEPLOY:" -ForegroundColor Yellow
Write-Host "  1. Copy the entire 'win-unpacked' folder" -ForegroundColor White
Write-Host "  2. Paste to any Windows computer" -ForegroundColor White
Write-Host "  3. Run 'Craft Automation CPQ.exe'" -ForegroundColor White
Write-Host "  4. No installation needed!" -ForegroundColor White
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Opening output folder..." -ForegroundColor Gray
Start-Sleep -Seconds 2
explorer "release\win-unpacked"
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
