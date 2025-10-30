@echo off
echo ========================================
echo Craft Tools Hub - Production Build
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo Building Electron app...
call npm run build:electron
if errorlevel 1 (
    echo.
    echo ERROR: Electron build failed
    pause
    exit /b 1
)

echo Building renderer...
call npm run build:renderer
if errorlevel 1 (
    echo.
    echo ERROR: Renderer build failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build completed successfully!
echo ========================================
echo.
echo To package the installer, run:
echo   npx electron-builder
echo.
echo The installer will be created in the 'release' folder.
echo.

pause
