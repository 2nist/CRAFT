# Deployment Kit - v1.0rc

## Package Contents
- [ ] Signed installer (`CraftToolsHub_Setup_v1.0rc.exe`).
- [ ] Checksum file (`CraftToolsHub_Setup_v1.0rc.sha256`).
- [ ] Release notes (`docs/releases/v1.0rc/RELEASE_NOTES.md`).
- [ ] Admin deployment guide (`ADMIN_GUIDE_DEPLOYMENT.md`).
- [ ] File locations guide (`ADMIN_GUIDE_FILE_LOCATIONS.md`).
- [ ] Maintenance guide (`ADMIN_GUIDE_MAINTENANCE.md`).
- [ ] Quick-start cheat sheet (PDF/one-pager) – pending creation.
- [ ] Rollback instructions (`docs/releases/v1.0rc/ROLLBACK.md`).

## Pre-Deployment
- [ ] Confirm target environment specs (Windows 10/11 x64, 8 GB RAM, 2 GB free disk).
- [ ] Validate antivirus exclusions for `%LOCALAPPDATA%/Programs/CraftToolsHub` and NAS share paths.
- [ ] Ensure NAS share for manuals/exports is reachable with service account.
- [ ] Notify stakeholders of deployment window and pilot users.
- [ ] Back up existing installation directory and `%APPDATA%/CraftToolsHub` data if upgrading.

## Deployment Steps
1. Transfer installer and checksum to staging machine.
2. Verify checksum (`Get-FileHash CraftToolsHub_Setup_v1.0rc.exe -Algorithm SHA256`).
3. Execute installer as administrator; accept default install path.
4. Launch application and sign in to confirm initial load.
5. Set the environment variable `CTH_RUNTIME_ROOT=\\192.168.1.99\CraftAuto-Sales\Temp_Craft_Tools_Runtime\updates\latest` using the provided `Set-CTHRuntimeRoot.ps1` script (or manual system settings) on any machine that should write to the shared runtime.
6. Point manuals configuration to NAS share if required.
7. Capture screenshots/video of install for help-desk reference.
8. Roll out to pilot group; collect feedback within 24 hours.
9. Approve production rollout and repeat steps across remaining endpoints.

## Training & Communications
- [ ] Send release announcement with highlights and deployment schedule.
- [ ] Upload recorded admin walkthrough to LMS/Teams channel.
- [ ] Schedule live Q&A for operations staff during release week.
- [ ] Provide help-desk script covering install, manual reset, and common errors.
- [ ] Distribute onboarding kit to any new hires aligned with go-live.

## Post-Deployment
- [ ] Monitor application and Windows Event Logs for 72 hours.
- [ ] Track support tickets; tag them with `CraftToolsHub v1.0rc` for reporting.
- [ ] Validate nightly backups of NAS/manual data complete successfully.
- [ ] Document lessons learned in release retrospective notes.
- [ ] Update roadmap backlog with feedback-driven enhancements.
