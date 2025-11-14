@echo off

echo.
echo ========================================================
echo         CRAFT AUTOMATION CPQ - ONE-CLICK BUILD
echo ========================================================
echo.
echo This will run the build automatically in this window.
echo.
echo Build time: 3-4 minutes
echo.
echo ========================================================
echo.

pause

echo.
echo Starting build process...
echo.
echo ========================================================
echo.
echo Step 1/4: Installing dependencies...
echo.

call npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo Step 2/4: Building Electron...
echo.

call npm run build:electron
if errorlevel 1 (
    echo ERROR: build:electron failed
    pause
    exit /b 1
)

echo.
echo Step 3/4: Building React UI...
echo.

call npm run build:renderer
if errorlevel 1 (
    echo ERROR: build:renderer failed
    pause
    exit /b 1
)

echo.
echo Step 4/4: Packaging application...
echo.

call npx electron-builder --win --dir
if errorlevel 1 (
    echo ERROR: electron-builder failed
    pause
    exit /b 1
)

echo.
echo ========================================================
echo.
echo BUILD COMPLETE!
echo ================
echo.
echo Your app is ready at:
echo release\win-unpacked\Craft Automation CPQ.exe
echo.
echo To deploy: Copy the entire win-unpacked folder to any PC
echo.
echo ========================================================
echo.

if exist "release\win-unpacked" (
    echo Opening output folder...
    explorer "release\win-unpacked"
)

echo.
pause