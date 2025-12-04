@echo off
echo ========================================
echo Craft Tools Hub - Development Launch
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

echo Starting Craft Tools Hub...
echo.
echo The app will open automatically.
echo Press Ctrl+C to stop the app.
echo.

call npm run electron:dev

pause
