# FORCE RELOAD - See New UI Changes

## The Problem
Code changes are saved but not appearing in the app.

## Solution - Do These Steps IN ORDER:

### Step 1: Stop Everything
1. Close ALL Electron windows
2. Stop the dev server (Ctrl+C in terminal)
3. Wait 2 seconds

### Step 2: Clear Cache
Run these commands in PowerShell (in the project folder):

```powershell
# Remove Vite cache
Remove-Item -Recurse -Force "node_modules/.vite" -ErrorAction SilentlyContinue

# Remove build folders
Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "dist-electron" -ErrorAction SilentlyContinue

Write-Host "Cache cleared!" -ForegroundColor Green
```

### Step 3: Restart Dev Server
```powershell
npm run electron:dev
```

### Step 4: Force Reload in Electron
When the Electron window opens:
1. Press **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac) - This is a HARD RELOAD
2. OR press **Ctrl+R** multiple times
3. OR close and reopen the Electron window

### Step 5: Verify
You should see:
- ✅ A **HUGE COLORFUL BANNER** saying "NEW v2.0 UI IS LOADED!"
- ✅ Beautiful gradient headers with icons
- ✅ Numbered instance cards
- ✅ Color-coded I/O sections

### If Still Not Working:

1. **Check Console (F12)**:
   - Look for `[v2.0 UI] Rendering assemblies:` messages
   - Look for `[Template Load]` messages
   - Check for JavaScript errors

2. **Verify File Was Saved**:
   - Open `src/plugins/QuoteConfigurator.jsx`
   - Search for "NEW v2.0 UI IS LOADED" (line ~984)
   - If you can't find it, the file wasn't saved

3. **Check You're Looking at Right Template**:
   - Make sure you're viewing a quote with a product template loaded
   - The template must have `assemblies` array (v2.0 structure)
   - Check template 100 or 108

4. **Nuclear Option**:
   - Close everything
   - Delete `node_modules` folder
   - Run `npm install`
   - Run `npm run electron:dev`

## What You Should See:

### OLD UI (WRONG):
- Flat list of fields
- No cards
- No instance numbering
- Simple headers

### NEW UI (CORRECT):
- ✅ Large gradient headers with ⚡ icon
- ✅ "v2.0" badge
- ✅ Numbered circular badges (1, 2, 3...)
- ✅ "Instance #1", "Instance #2" headers
- ✅ Color-coded I/O sections (blue/green/yellow/purple borders)
- ✅ Beautiful sub-assembly checkboxes
- ✅ Gradient backgrounds everywhere

If you see the colorful banner but not the UI, there's a rendering issue - check console for errors.

