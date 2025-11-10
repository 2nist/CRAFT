# Admin Guide: File Inputs and Outputs

This guide lists every location the Craft Tools Hub desktop app reads from or writes to. Paths are shown for both the bundled application files and the per-user runtime data that lives under `%APPDATA%` on Windows.

---

## 1. Key Root Directories

| Purpose | Location (Development Checkout) | Location (Packaged App) |
|---------|---------------------------------|-------------------------|
| Application files | `c\Users\CraftAuto-Sales\cth\craft_tools_hub` | `%ProgramFiles%\Craft Tools Hub` (or wherever you install the app) |
| Bundled data (read-only defaults) | `src/data/**` | `%InstallDir%\resources\data\**` |
| User data root (`app.getPath('userData')`) | `C:\Users\<USER>\AppData\Roaming\electron-vite-react-app` | Same |
| User data working directory | `%APPDATA%\electron-vite-react-app\data` | Same |
| Manual cache folder | `%APPDATA%\electron-vite-react-app\ComponentManuals` | Same |
| Export drop folder (BOM CSV, etc.) | `<AppRoot>\OUTPUT` | `%InstallDir%\OUTPUT` (or `CTH_RUNTIME_ROOT\OUTPUT` if the environment variable is set) |

> **Tip:** When testing locally, your development checkout and the packaged install can coexist. Runtime writes always target `%APPDATA%\electron-vite-react-app\...` unless otherwise noted.

---

## 2. Bundled Input Files (Read-Only Defaults)

These ship with the application and serve as the starting point for user data.

| Data | Dev Path | Packaged Path | Used By |
|------|----------|---------------|---------|
| Component catalog (master) | `src/data/components/component_catalog.json` | `%InstallDir%/resources/data/components/component_catalog.json` | Global Component Search, component pickers |
| Sub-assembly library | `src/data/sub-assemblies/sub_assemblies.json` | `%InstallDir%/resources/data/sub-assemblies/sub_assemblies.json` | Quote Configurator, Product Template Manager |
| Product template defaults | `src/data/templates/**` (if present) | `%InstallDir%/resources/data/templates/**` | Product Template Manager |
| Schema files | `src/data/schemas/*.json` | `%InstallDir%/resources/data/schemas/*.json` | Validation, dynamic forms |
| Plugin registry | `public/plugin_registry.json` | Packaged into app resources | Top-level navigation |

Bundled files are never edited at runtime; the app copies or augments them under the user data tree.

---

## 3. User Data (Runtime Writes)

All editable content lives beneath `%APPDATA%\electron-vite-react-app`. Inside that root, the app maintains the following files and folders:

| File / Folder | Description | Created By |
|---------------|-------------|------------|
| `data/components/component_catalog.json` | Merged component list after CSV syncs. Only components with a price remain. | Component sync (`components:sync-from-csv`) |
| `data/sub_assemblies.json` | User-authored or edited sub-assemblies. Overrides bundled definitions. | Sub-Assembly Manager / Quote Configurator saves |
| `data/product-templates/*.json` | Templates saved per product code. | Product Template Manager |
| `data/quotes/*.json` | Persisted quotes, one file per quote ID. | Quote save/load flows |
| `data/projects.json` & `data/projects_log.csv` | Dashboard recent quotes list and export log. | Quote Configurator / Dashboard |
| `data/manual_index.json` | Map of component IDs to manual URLs or local paths. | Manual system |
| `ComponentManuals/` | Local manual files (.pdf, .html, etc.) stored by admins. | Manual system |
| `data/manual_boms.json` | Saved manual BOM entries from the Manual BOM Builder. | Manual BOM Builder |
| `data/settings.json` | Theme and other persisted settings. | Dashboard settings |
| `data/projects/*.csv` (if present) | Additional exports triggered by future features. | TBD |

> **Backup hint:** Copying the entire `%APPDATA%\electron-vite-react-app` directory captures every user-editable asset: components, sub-assemblies, templates, quotes, manuals, and settings.

---

## 4. Exports and Reports

| Output | Path | Notes |
|--------|------|-------|
| BOM CSV exports (assemblies or operational items) | `<AppRoot>\OUTPUT\BOM_*.csv` | Triggered from Quote Configurator Step 4. In development this is your repo `OUTPUT` folder; in production it lives alongside the installed app or `CTH_RUNTIME_ROOT\OUTPUT` when pointed at the NAS. |
| Number log (`number_log.csv`) | `%APPDATA%\electron-vite-react-app\OUTPUT\number_log.csv` | Created when quote/project numbers are generated. Directory created automatically. |

If you prefer all exports under `%APPDATA%`, adjust the `app:write-file` handler in `electron/main.js` to target the user data root.

---

## 5. Manual System Flow Recap

1. **View Manual** checks `data/manual_index.json` for an existing entry (keyed by SKU ⇢ vendor number ⇢ component ID).
2. If absent, the system opens an external browser search. Admins paste the final PDF/HTML link into the confirmation modal.
3. Confirmed links are saved back into the manual index. Local files can be stored in `ComponentManuals` and referenced with a `file:///` URL.

---

## 6. Quick Reference Table

| Task | Location |
|------|----------|
| Update base component list before packaging | `src/data/components/component_catalog.json` |
| Replace sub-assembly defaults | `src/data/sub-assemblies/sub_assemblies.json` |
| Inspect or clear user-synced component catalog | `%APPDATA%\electron-vite-react-app\data\components\component_catalog.json` |
| Grab manual cache for another workstation | `%APPDATA%\electron-vite-react-app\data\manual_index.json` and `%APPDATA%\electron-vite-react-app\ComponentManuals` |
| Collect exported BOMs for orders | `<AppRoot>\OUTPUT` |

Keep this sheet with your deployment checklist so new admins know exactly where to pull backups and drop updated reference data.
