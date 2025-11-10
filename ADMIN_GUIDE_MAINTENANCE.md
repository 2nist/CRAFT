# Admin Guide: Ongoing Maintenance

This guide covers the recurring tasks admins perform to keep Craft Tools Hub healthy, current, and ready for packaging or deployment.

---

## 1. Weekly / Before Packaging Checklist

1. **Sync component catalog**
   - Export the latest component price list to CSV.
   - In the app, open **Products → Component Manager → Smart Sync**, upload the CSV, and confirm the summary.
   - The merged catalog is saved to `%APPDATA%\electron-vite-react-app\data\components\component_catalog.json` with all zero-priced “dummy” parts automatically removed.
2. **Refresh sub-assembly library**
   - Open **Products → Sub-Assembly Manager**.
   - Use the “Export” button for a backup, then edit or import new assemblies as needed.
   - Confirm the merged list by reopening the manager after a restart (data stored in `%APPDATA%\electron-vite-react-app\data\sub_assemblies.json`).
3. **Validate product templates**
   - In **Products → Product Template Manager**, step through each product line.
   - Ensure templates load without errors and spot-check I/O sections and assemblies.
   - Resave any edited template so `%APPDATA%\electron-vite-react-app\data\product-templates/*.json` reflects the latest logic.
4. **Verify Quote Configurator**
   - Create a sample quote, add several assemblies, and generate the BOM/export to ensure no stale caches are present.
   - Delete the test quote from **Quoting → Quote Configurator → Load** to keep the storage tidy.
5. **Check manual references**
   - Open **Tools → Global Component Search** (Ctrl+K).
   - Sample a component with a saved manual; the “View Manual” button should open the stored PDF/HTML link immediately.
   - If a link is outdated, reopen the search, paste the new URL, and re-save. The index lives at `%APPDATA%\electron-vite-react-app\data\manual_index.json`.

---

## 2. Monthly Hygiene

| Task | Steps |
|------|-------|
| **Back up user data** | Copy the entire `%APPDATA%\electron-vite-react-app` folder (includes components, sub-assemblies, templates, quotes, manuals, settings). |
| **Archive manual files** | Review `%APPDATA%\electron-vite-react-app\ComponentManuals`. Remove obsolete PDFs/HTML or replace with updated versions. |
| **Clear obsolete exports** | Clean out `<InstallDir>\OUTPUT` (or `CTH_RUNTIME_ROOT\OUTPUT` on NAS deployments). Move finished BOM CSVs to long-term storage. |
| **Review log files** | `projects_log.csv` inside `%APPDATA%\electron-vite-react-app\data` tracks number generation. Rotate or archive as needed. |
| **Test packaging** | Run `npm run electron:build` from the repo root to confirm the app still builds. Resolve any build warnings before the monthly cut. |

---

## 3. Troubleshooting & Recovery

- **Component catalog corruption**: Delete `%APPDATA%\electron-vite-react-app\data\components\component_catalog.json` and relaunch. The app falls back to the bundled catalog; rerun the smart sync to reapply updates.
- **Manual cache issues**: Remove the offending entry from `manual_index.json` (JSON editor) or delete the entire file to reset. Locally stored manuals remain under `ComponentManuals/`.
- **Template misconfiguration**: Delete the product’s JSON file under `%APPDATA%\electron-vite-react-app\data\product-templates`, then reload the template manager to rebuild from defaults.
- **Stale sub-assembly cache**: Delete `%APPDATA%\electron-vite-react-app\data\sub_assemblies.json`. On next launch, only bundled sub-assemblies load.
- **Exports writing to the wrong folder**: Confirm `electron/main.js` `app:write-file` handler points to the correct directory. Adjust if you want BOM CSVs stored in `%APPDATA%` instead of `<InstallDir>\OUTPUT`.

---

## 4. Environment Maintenance

1. **Keep Node/Electron toolchain current**
   - Run `npm install` periodically to pick up caret-range dependency updates.
   - Use `npm outdated` to review major upgrades before packaging.
2. **Lint/Test (optional but recommended)**
   - `npm run test` for jest suite.
   - `npm run build` to ensure the Electron/Vite build still completes.
3. **Source control cleanup**
   - Commit admin guide updates and schema changes into the repo before packaging a release branch.

---

## 5. Packaging Reminder

When ready to ship:
1. `npm run electron:build`
2. Collect the generated artifacts from `release/`
3. Copy `%APPDATA%\electron-vite-react-app` (or a curated subset) if you need to seed end-user installations with live data.

Keep this checklist near the admin console so new maintainers can step through the same process without digging into the codebase.
