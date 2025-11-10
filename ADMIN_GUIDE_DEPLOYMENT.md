# Admin Guide: Deployment & Updates

Use this guide when rolling out Craft Tools Hub to your team. It covers three supported deployment patterns:

1. **Local Installation (per workstation)**
2. **NAS-Hosted Shared Build (run from network share)**
3. **Portable Package (USB/portable directory)** ← optional but handy for contractors or quick demos

Each section includes installation, initial implementation tasks, day-to-day use, and update workflows.

---

## 1. Local Installation (Per Workstation)

### 1.1 Requirements
- Windows 10/11 workstation with write access to `%APPDATA%`
- Node/Electron not required after packaging (only needed on build machine)
- Antivirus exception for the install directory (prevents false positives on Electron apps)

### 1.2 Installation Steps
1. Build the app on an admin machine: `npm run electron:build` (outputs to `release/`).
2. Copy the resulting folder (e.g., `Craft Tools Hub-win32-x64`) to the target workstation under `%ProgramFiles%` or `C:\CraftToolsHub`.
3. Optionally create a desktop/start-menu shortcut pointing to `Craft Tools Hub.exe`.
4. Launch once to generate the user data directory at `%APPDATA%\electron-vite-react-app`.

### 1.3 Implementation (Initial Data Seeding)
- If you have curated data (component catalog, sub-assemblies, templates, manuals), copy your staged `%APPDATA%\electron-vite-react-app` folder onto the workstation before first launch.
- Otherwise, let the app use bundled defaults and run the maintenance steps to sync the latest CSVs.

### 1.4 Daily Use
- Users launch the local executable. Runtime data lives entirely under their profile (`%APPDATA%`).
- Backups are per user; include the `%APPDATA%` directory in workstation backup policies.

### 1.5 Updates
1. Build a new package (`npm run electron:build`).
2. Replace the install folder on each workstation (silent copy or use a packaging tool like PDQ Deploy).
3. User data remains untouched because it resides under `%APPDATA%`.
4. After major upgrades, rerun through the Weekly Checklist from the Maintenance guide to ensure synced data is current.

---

## 2. NAS-Hosted Shared Build (Run from Network Share)

### 2.1 Requirements
- Central NAS share accessible via UNC path (e.g., `\\NAS\CraftToolsHub`)
- Read/execute permissions for all users; write permission for admins to push updates.
- Network latency low enough for launching executables (<10–20 ms recommended).

### 2.2 Installation Steps
1. Build the app (`npm run electron:build`).
2. Copy the packaged folder to the NAS share, e.g., `\\NAS\CraftToolsHub\Craft Tools Hub-win32-x64`.
3. Distribute a shortcut to end users pointing to `\\NAS\CraftToolsHub\Craft Tools Hub-win32-x64\Craft Tools Hub.exe`.
4. Set the environment variable `CTH_RUNTIME_ROOT=\\NAS\CraftToolsHub\Craft Tools Hub-win32-x64` (or wherever you host the runtime) on each workstation. This redirects exports and manual syncs to the shared path. Provide `Set-CTHRuntimeRoot.ps1` from the NAS build if you want a one-click setup.
5. First launch still creates the user data folder under each user’s `%APPDATA%`; only the binaries and shared outputs sit on the NAS.

### 2.3 Implementation Notes
- Distribute the helper script `Set-CTHRuntimeRoot.ps1` (generated during NAS publish) so admins can set the environment variable with one command. Users need only read/execute rights to the shared runtime.
- To pre-seed data for everyone, place your curated `%APPDATA%\electron-vite-react-app` folder in a staging area. Provide a small script (PowerShell or batch) that copies it into the user profile on first run.
- If multiple admins maintain data, coordinate changes via source control or the maintenance checklist to keep components/sub-assemblies in sync before the weekly rebuild.

### 2.4 Daily Use
- Users launch the app via the network shortcut. It runs locally but reads binaries from the NAS.
- User data remains local, so NAS downtime does not affect saved quotes or templates once the app is running.

### 2.5 Updates
1. Notify users to exit the application.
2. Overwrite the NAS folder with the new build (retain the same path so shortcuts stay valid).
3. Users relaunch from the same shortcut; no further action required.
4. If the component catalog or templates require bulk updates, push a refreshed `%APPDATA%` seed kit alongside the binary update and instruct users to replace their data folder before relaunching.

> **Tip:** Keep previous builds in a `_archive` subfolder on the NAS so you can roll back quickly if needed.

---

## 3. Portable Package (USB / Self-Contained Folder)

This option is useful for contractors, field demos, or situations where you cannot install software.

### 3.1 Requirements
- USB drive or removable SSD with at least 1 GB free.
- Windows host with ability to run executables from removable media.

### 3.2 Setup
1. Build the app (`npm run electron:build`).
2. Copy the packaged folder to the USB drive.
3. Create a sibling folder on the USB drive, e.g., `PortableData`, containing the desired `%APPDATA%\electron-vite-react-app` snapshot.
4. Create a helper script (`RunPortable.cmd`) that sets the `APPDATA` environment variable to point at the portable data folder before launching the app:
   ```cmd
   @echo off
   setlocal
   set APPDATA=%~dp0PortableData
   start "Craft Tools Hub" "%~dp0Craft Tools Hub-win32-x64\Craft Tools Hub.exe"
   ```
5. Users double-click the script; all runtime data stays on the USB drive.

### 3.3 Maintenance & Updates
- Replace the portable folder with a fresh build and updated `PortableData` snapshot when issuing updates.
- Remind users to close the app before unplugging the drive to avoid data corruption.

---

## 4. Implementation Advice (All Modes)

| Area | Recommendation |
|------|----------------|
| **Versioning** | Tag builds in Git and name release folders with the version/date (e.g., `CraftToolsHub_2025-11-07`). |
| **Data Seeding** | Use the maintenance scripts to produce a clean `%APPDATA%` snapshot after weekly checks. Distribute that snapshot with every build so fresh installations start from the same baseline. |
| **Security** | If manuals or catalogs contain sensitive pricing, set appropriate NTFS permissions on the NAS share or encrypted drives. |
| **Support** | Keep `ADMIN_GUIDE_FILE_LOCATIONS.md` and `ADMIN_GUIDE_MAINTENANCE.md` alongside this document for ready reference. |

---

## 5. Update Playbook

Regardless of deployment mode, follow this sequence for major updates:

1. **Prep**
   - Finish the maintenance checklist (component sync, template validation, manual link audit).
   - Commit changes to source control.
   - Run `npm run electron:build` and smoke-test the packaged app.

2. **Package**
   - Zip or copy the build folder to the distribution location (NAS, local installer share, or portable media).
   - Include a `README_RELEASE_NOTES.txt` summarizing changes.

3. **Distribute**
   - Local install: run the installer/copy script on each workstation.
   - NAS: replace the shared folder, notify users when ready.
   - Portable: update the USB package and hand it off.

4. **Post-Update Checks**
   - Launch the app, load a sample quote, generate a BOM, and open a manual to confirm all pipelines remain intact.
   - Update the maintenance log with the new build number and deployment date.

---

## 6. Quick Decision Matrix

| Scenario | Recommended Mode |
|----------|------------------|
| Dedicated engineering workstation | Local installation |
| Shared operations team on same network | NAS-hosted shared build |
| Contractors / field technicians | Portable package |

Choose the model that fits your IT policies, then follow the corresponding steps above. Keep this deployment guide with your admin binder so anyone can reproduce the setup end-to-end.
