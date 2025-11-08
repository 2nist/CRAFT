param(
    [string]$TargetPath = "\\192.168.1.99\CraftAuto-Sales\Temp_Craft_Tools_Runtime",
    [string]$Version = "v1.0rc",
    [switch]$SkipBuild,
    [switch]$SkipNodeModules
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Write-Host "Repository root: $repoRoot" -ForegroundColor Cyan

Push-Location $repoRoot
try {
    if (-not $SkipBuild) {
        Write-Host "Running npm run build (renderer + electron)..." -ForegroundColor Cyan
        npm run build | Write-Output
        if ($LASTEXITCODE -ne 0) {
            throw "npm run build failed with exit code $LASTEXITCODE"
        }
    }

    $updatesRoot = Join-Path $TargetPath 'updates'
    if (-not (Test-Path $updatesRoot)) {
        Write-Host "Creating updates root at $updatesRoot" -ForegroundColor Cyan
        New-Item -ItemType Directory -Path $updatesRoot -Force | Out-Null
    }

    $versionPath = Join-Path $updatesRoot $Version
    $latestPath = Join-Path $updatesRoot 'latest'

    if (Test-Path $versionPath) {
        Write-Host "Removing existing version folder $versionPath" -ForegroundColor Yellow
        Remove-Item $versionPath -Recurse -Force
    }

    New-Item -ItemType Directory -Path $versionPath | Out-Null

    function Sync-Directory {
        param(
            [string]$RelativePath,
            [string]$DestinationRoot
        )

        $sourcePath = Join-Path $repoRoot $RelativePath
        if (-not (Test-Path $sourcePath)) {
            Write-Host "Skipping missing source $RelativePath" -ForegroundColor Yellow
            return
        }

        $destinationPath = Join-Path $DestinationRoot $RelativePath
        if (-not (Test-Path $destinationPath)) {
            New-Item -ItemType Directory -Path $destinationPath -Force | Out-Null
        }

        Write-Host "Syncing $RelativePath" -ForegroundColor Green
        $args = @($sourcePath, $destinationPath, '/MIR', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/R:1', '/W:1')
        $robocopy = Start-Process -FilePath 'robocopy' -ArgumentList $args -Wait -PassThru -NoNewWindow
        if ($robocopy.ExitCode -gt 7) {
            throw "Robocopy failed for $RelativePath (exit code $($robocopy.ExitCode))"
        }
    }

    $directoriesToSync = @(
        'dist',
        'dist-electron',
        'electron',
        'public',
        'plugins',
        'src',
        'docs',
        'OUTPUT'
    )

    foreach ($dir in $directoriesToSync) {
        Sync-Directory -RelativePath $dir -DestinationRoot $versionPath
    }

    if (-not $SkipNodeModules -and (Test-Path (Join-Path $repoRoot 'node_modules'))) {
        Sync-Directory -RelativePath 'node_modules' -DestinationRoot $versionPath
    } elseif ($SkipNodeModules) {
        Write-Host 'Skipping node_modules copy (SkipNodeModules switch set).' -ForegroundColor Yellow
    } else {
        Write-Host 'node_modules directory not found locally; skipping copy.' -ForegroundColor Yellow
    }

    $filesToCopy = @(
        'package.json',
        'package-lock.json',
        'vite.config.js',
        'vite.config.electron.js',
        'tailwind.config.js',
        'babel.config.js',
        'postcss.config.js',
        'jsconfig.json',
        'build-app.bat',
        'run-app.bat',
        'README.md',
        'ADMIN_GUIDE_DEPLOYMENT.md',
        'ADMIN_GUIDE_FILE_LOCATIONS.md',
        'ADMIN_GUIDE_MAINTENANCE.md'
    )

    foreach ($file in $filesToCopy) {
        $sourceFile = Join-Path $repoRoot $file
        if (Test-Path $sourceFile) {
            $destFile = Join-Path $versionPath $file
            Write-Host "Copying $file" -ForegroundColor Green
            Copy-Item $sourceFile -Destination $destFile -Force
        } else {
            Write-Host "Skipping missing file $file" -ForegroundColor Yellow
        }
    }

    $commit = ''
    $branch = ''
    try {
        $commit = (git rev-parse HEAD).Trim()
        $branch = (git rev-parse --abbrev-ref HEAD).Trim()
    } catch {
        Write-Warning "Unable to fetch git metadata: $($_.Exception.Message)"
    }

    $buildInfo = [ordered]@{
        version      = $Version
        commit       = $commit
        branch       = $branch
        timestampUtc = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
        source       = $repoRoot.Path
    }

    $buildInfoPath = Join-Path $versionPath 'build-info.json'
    $buildInfo | ConvertTo-Json -Depth 3 | Set-Content -Path $buildInfoPath -Encoding UTF8

    if (Test-Path $latestPath) {
        Write-Host "Refreshing latest pointer at $latestPath" -ForegroundColor Cyan
        Remove-Item $latestPath -Recurse -Force
    }

    New-Item -ItemType Directory -Path $latestPath | Out-Null
    $argsLatest = @($versionPath, $latestPath, '/MIR', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/R:1', '/W:1')
    $robocopyLatest = Start-Process -FilePath 'robocopy' -ArgumentList $argsLatest -Wait -PassThru -NoNewWindow
    if ($robocopyLatest.ExitCode -gt 7) {
        throw "Robocopy failed when updating latest (exit code $($robocopyLatest.ExitCode))"
    }

    $envHintPath = Join-Path $TargetPath 'runtime.env.example'
    "CTH_RUNTIME_ROOT=$latestPath" | Set-Content -Path $envHintPath -Encoding UTF8

    $envScript = @"
param(
    [ValidateSet('User','Machine')]
    [string]`$Scope = 'User'
)

`$target = '$latestPath'
[Environment]::SetEnvironmentVariable('CTH_RUNTIME_ROOT', `$target, `$Scope)
Write-Host "CTH_RUNTIME_ROOT set to `$target for scope `$Scope."
"@
    $envScriptPath = Join-Path $TargetPath 'Set-CTHRuntimeRoot.ps1'
    $envScript | Set-Content -Path $envScriptPath -Encoding UTF8

    $envBatchLines = @(
        '@echo off',
        'setlocal',
        "set `"TARGET=$latestPath`"",
        'if /I "%~1"=="/machine" (',
        "  powershell -NoLogo -NoProfile -Command \"[Environment]::SetEnvironmentVariable(''CTH_RUNTIME_ROOT'', '$latestPath', 'Machine')\"",
        '  goto done',
        ')',
        "setx CTH_RUNTIME_ROOT \"$latestPath\" > nul",
        ':done',
        'echo CTH_RUNTIME_ROOT set to %TARGET%'
    )
    $envBatch = ($envBatchLines -join "`r`n") + "`r`n"
    $envBatchPath = Join-Path $TargetPath 'Set-CTHRuntimeRoot.bat'
    $envBatch | Set-Content -Path $envBatchPath -Encoding ASCII

    Write-Host "NAS publish complete. Version folder: $versionPath" -ForegroundColor Green
} finally {
    Pop-Location
}
