# Rollback Plan - v1.0rc

## Objectives
Provide a controlled procedure to revert Craft Tools Hub to the previously approved release if critical issues are discovered after deploying v1.0rc.

## Prerequisites
- Confirm availability of the last stable installer (e.g., `CraftToolsHub_Setup_v0.9.5.exe`).
- Ensure backups of the following exist:
  - `%APPDATA%/CraftToolsHub` user configuration and cached data.
  - NAS shares for manuals and exports.
  - Any locally modified templates or CSV libraries.
- Communicate rollback decision to stakeholders and help-desk.

## Decision Matrix
Rollback triggers include:
- Blocking defects preventing quote creation or exports.
- Data corruption in templates or component catalogs.
- Security concerns (unsigned binaries, antivirus quarantines).
- Failure to meet SLA metrics after escalation triage.

## Step-by-Step Procedure
1. **Freeze Deployments**  
   Halt further installations of v1.0rc. Notify admins to pause new rollouts.

2. **Collect Diagnostics**  
   Gather logs (`%APPDATA%/CraftToolsHub/logs/`, Event Viewer entries) and summarize incident ID.

3. **Uninstall v1.0rc**  
   - Use “Add or Remove Programs” to remove Craft Tools Hub v1.0rc.
   - Verify `%LOCALAPPDATA%/Programs/CraftToolsHub` is removed. Preserve user exports under `Documents/` or NAS shares.

4. **Restore Previous Version**  
   - Validate installer checksum for the stable build.
   - Install the earlier version using admin rights.
   - Launch the app to confirm baseline functionality.

5. **Restore Data (If Needed)**  
   - Replace `%APPDATA%/CraftToolsHub` with backup copy if configuration reverted.
   - Restore manual registry files or template libraries from backup.

6. **Validation**  
   - Execute smoke tests (launch, navigation, manual access, sample quote creation).
   - Document results in the rollback incident log.

7. **Communications**  
   - Inform end users and stakeholders that rollback is complete.
   - Provide ETA for remediated build or hotfix if known.

8. **Post-Rollback Review**  
   - Log root cause and corrective actions in the release retrospective.
   - Update risk register and QA checklist for future releases.

## Contacts
- Engineering Lead: ____________________
- QA Lead: ____________________
- Help-Desk Manager: ____________________

## Artifacts to Update Post-Rollback
- Incident report in ticketing system.
- Release notes (append rollback section).
- Knowledge base articles reflecting current production version.
