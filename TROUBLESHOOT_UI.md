# Troubleshooting: v2.0 UI Not Showing

## Quick Fix Steps

### Step 1: Check if you're in DEV mode or BUILD mode

**If using `npm run electron:dev` (DEV MODE):**
1. Stop the server (Ctrl+C in terminal)
2. Restart: `npm run electron:dev`
3. In Electron window, press **Ctrl+R** (Windows) or **Cmd+R** (Mac) to reload
4. Or close and reopen the Electron window

**If using `npm run build` (BUILD MODE):**
1. Rebuild the app: `npm run electron:build`
2. Run the built app from `dist/` folder
3. **Note:** Changes won't appear until you rebuild!

### Step 2: Check the Console

1. Open DevTools in Electron (F12 or right-click > Inspect)
2. Go to Console tab
3. Look for these messages:
   - `[Template Load] Template loaded:` - Should show `assembliesIsArray: true`
   - `[v2.0 UI] Rendering assemblies:` - Should show assembly count
   - If you see `assembliesIsArray: false` or `NOT AN ARRAY`, migration failed

### Step 3: Verify Template Migration

If using template 108 (old format), you should see:
- Console message: `Migrating legacy template "108" to v2.0 structure in memory.`
- The UI should show a "v2.0" badge on each assembly card

### Step 4: Check What You Should See

**NEW v2.0 UI Features:**
- ✅ Green "v2.0" badge on each assembly card header
- ✅ Assembly cards show "Assembly Name #1", "#2" for instances
- ✅ "Add Assembly" button (if `allowMultiple: true`)
- ✅ Sub-Assemblies section with Required (read-only) and Optional (checkboxes)
- ✅ Features badges displayed in assembly header

**OLD UI (if still seeing this):**
- ❌ Flat I/O field list (no cards)
- ❌ No instance numbering
- ❌ No sub-assemblies section
- ❌ No "v2.0" badge

### Step 5: Force Clear Cache

1. Close all Electron windows
2. Stop all Node processes
3. Delete `dist/` and `dist-electron/` folders (if they exist)
4. Restart: `npm run electron:dev`

## Still Not Working?

Check these files are saved:
- ✅ `src/plugins/QuoteConfigurator.jsx` - Has new rendering code (lines 1021-1210)
- ✅ `electron/main.js` - Has migration service integration (line ~1811)
- ✅ `src/services/TemplateMigrationService.js` - Exists and works

If still not working, check the browser console for JavaScript errors.

