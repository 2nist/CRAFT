# Script to set up NSIS and build installer for Craft Automation CPQ

param(
    [switch]$SkipNsisInstall = $false
)

$ErrorActionPreference = "Stop"

Write-Host "`n=== CRAFT AUTOMATION CPQ - NSIS INSTALLER BUILDER ===" -ForegroundColor Green
Write-Host ""

# Check if NSIS is available
$nsisPath = $null
$possibleLocations = @(
    "C:\Program Files\NSIS\makensis.exe",
    "C:\Program Files (x86)\NSIS\makensis.exe"
)

foreach ($location in $possibleLocations) {
    if (Test-Path $location) {
        $nsisPath = $location
        Write-Host "Found NSIS at: $nsisPath`n" -ForegroundColor Green
        break
    }
}

if (-not $nsisPath) {
    if ($SkipNsisInstall) {
        Write-Host "NSIS not found and auto-install skipped`n" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "NSIS not found. Attempting installation...`n" -ForegroundColor Cyan
    
    $wingetAvailable = $null -ne (Get-Command winget -ErrorAction SilentlyContinue)
    if ($wingetAvailable) {
        Write-Host "Installing NSIS...`n"
        winget install --id NSIS.NSIS -e --accept-package-agreements 2>&1 | Out-Null
        Start-Sleep -Seconds 2
    }
}

# Run the installer builder
Write-Host "Starting NSIS installer build...`n" -ForegroundColor Cyan
node build-installer-standalone.mjs

exit $LASTEXITCODE
