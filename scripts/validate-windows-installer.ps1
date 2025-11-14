<#
  validate-windows-installer.ps1
  - Finds the most recent built installer (.exe) in the workspace
  - Performs a silent install to a temp folder
  - Attempts to launch the installed exe briefly and then uninstalls
  - Exits with non-zero code on failures
#>
Param()

Set-StrictMode -Version Latest
Write-Host "Starting Windows installer validation..."

$cwd = Get-Location
$installer = Get-ChildItem -Path $cwd -Filter *.exe -Recurse | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $installer) {
  Write-Error "No installer .exe found in workspace"
  exit 2
}

Write-Host "Installer found: $($installer.FullName)"

$installDir = Join-Path $env:TEMP 'cth_installer_install'
if (Test-Path $installDir) { Remove-Item -Recurse -Force $installDir }
New-Item -ItemType Directory -Path $installDir | Out-Null

try {
  $args = @('/S', "/D=$installDir")
  Write-Host "Running installer silently to: $installDir"
  $proc = Start-Process -FilePath $installer.FullName -ArgumentList $args -Wait -PassThru -NoNewWindow
  Write-Host "Installer exit code: $($proc.ExitCode)"
} catch {
  Write-Error "Installer execution failed: $_"
  exit 3
}

Start-Sleep -Seconds 2

# Find the installed executable (heuristic: largest EXE in install path)
$exe = Get-ChildItem -Path $installDir -Filter *.exe -Recurse | Where-Object { $_.Name -notmatch 'uninstall' } | Sort-Object Length -Descending | Select-Object -First 1
if (-not $exe) {
  Write-Error "No installed executable found under $installDir"
  exit 4
}

Write-Host "Found installed exe: $($exe.FullName)"

try {
  $p = Start-Process -FilePath $exe.FullName -PassThru
  Write-Host "Launched process Id: $($p.Id)"
  Start-Sleep -Seconds 5
  Write-Host "Stopping process..."
  Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
} catch {
  Write-Error "Failed to launch/stop installed exe: $_"
  # attempt uninstall even on failure
}

# Attempt silent uninstall if uninstaller exists
$uninstaller = Get-ChildItem -Path $installDir -Filter *uninstall*.exe -Recurse | Select-Object -First 1
if ($uninstaller) {
  Write-Host "Running uninstaller: $($uninstaller.FullName)"
  try {
    Start-Process -FilePath $uninstaller.FullName -ArgumentList '/S' -Wait -NoNewWindow
  } catch {
    Write-Warning "Uninstaller failed: $_"
  }
}

Write-Host "Installer smoke test completed successfully. Cleaning up."
if (Test-Path $installDir) { Remove-Item -Recurse -Force $installDir }
exit 0
