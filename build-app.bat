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
echo Creating Windows Installer...
echo ========================================
echo.

call npx electron-builder --win --publish=never
if errorlevel 1 (
    echo.
    echo ERROR: Installer creation failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build and installer creation completed successfully!
echo ========================================
echo.
echo Installer created in the 'release' folder:
echo - Craft Automation CPQ Setup 1.0.0.exe (installer)
echo - win-unpacked\ (portable version)
echo.
echo Run the .exe file to install the app with shortcuts and uninstaller.

pause
