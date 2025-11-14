**Windows Installation Guide**

- **Purpose:** Help beta testers and support install, validate, and collect diagnostics for the Windows installer.

- **Installer artifact location (in repo):** `artifacts/craft_tools_hub-installer-windows.exe`

- **Manual install (GUI):**
  - Double-click the `.exe` and follow the NSIS installer UI.
  - Choose install location when prompted.

- **Silent install (for automated validation or testers):**
  - Run from PowerShell (replace installer path):

```powershell
Start-Process -FilePath ".\artifacts\craft_tools_hub-installer-windows.exe" -ArgumentList '/S','/D=C:\Temp\cth_installed' -Wait
```

- **Silent uninstall:**
  - If installer placed an `uninstall.exe` in the install folder, run:

```powershell
Start-Process -FilePath 'C:\Temp\cth_installed\uninstall.exe' -ArgumentList '/S' -Wait
```

- **Smoke-test script (automated verification):**
  - We include a smoke-test script used by CI: `scripts/validate-windows-installer.ps1`.
  - It will: find the most recent `.exe` in the workspace, silently install to a temp folder, launch the installed exe briefly, then uninstall.
  - Run it locally for quick checks:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-windows-installer.ps1
```

- **Collecting diagnostics for support:**
  - If you hit problems after installing, please provide:
    - `nas-report.json` (run `npm run check:nas` to generate into console or file).
    - The output of the smoke-test script run (console logs).
    - Any Windows Event Viewer Application logs from the time of failure.

- **Common flags / tips:**
  - Use `/S` for silent NSIS installs; `/D=path` must be the last argument and cannot be quoted.
  - If the installer asks for elevated privileges, run an elevated PowerShell prompt.
  - If your organization requires signed installers, the unsigned artifact will trigger warnings — see the code-signing notes (TODO) for signing recipe.
