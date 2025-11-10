# QA Checklist - v1.0rc

## Release Information
- Product version: v1.0rc
- Build date: 2025-11-07
- Commit hash/tag: TBD (tag once release branch is frozen)
- QA owner: ____________________
- Environment(s) tested: QA Windows 11 VM, Pilot desktop (pending)

## Smoke Tests
- [ ] Application launches without errors.
- [ ] Authentication/initialization completes.
- [ ] Core navigation loads expected plugins.
- [ ] Database/NAS connections succeed.
- [ ] Manual system opens and renders documentation.

## Functional Validation
| Area | Scenario | Result | Notes |
| ---- | -------- | ------ | ----- |
| Quote Configurator | Create quote from v2 template | Pending | Execute using `Sample_Template_200.json`. |
| Quote Configurator | Duplicate legacy quote | Pending | Validate migration banner and data integrity. |
| Product Template Manager | Add template with IO fields | Pending | Ensure accent overrides display correctly. |
| Global Component Search | Search by vendor number | Pending | Confirm prioritization of vendor hits. |
| BOM Importer | Import CSV (happy path) | Pending | Use `BOM_IMPORT_TEMPLATE_CLEAN.csv`. |
| Manual BOM Builder | Export spreadsheet | Pending | Check file saved to `OUTPUT/` share. |
| Settings | Update accent color/theme | Pending | Verify Tailwind override propagates. |

_Add additional scenarios as needed._

## Regression & Edge Cases
- [ ] Zero-priced components stay filtered.
- [ ] Offline mode messaging appears if NAS unreachable.
- [ ] Legacy templates migrate to v2 structure.
- [ ] Manual URLs persist across restarts.
- [ ] Large CSV (>5k rows) imports successfully.

## Performance Checks
- [ ] Loading time under target threshold: ____ seconds.
- [ ] Memory usage stable during large quote assembly.
- [ ] No renderer crash or unresponsive dialog.

## Electron Packaging
- [x] Windows installer builds via `npm run build` / `npx electron-builder`.
- [ ] App adds desktop/start menu shortcuts.
- [ ] Uninstall leaves no residual data (besides user exports).
- [ ] On NAS deployment, `CTH_RUNTIME_ROOT` points to shared runtime and BOM exports land on the NAS.

## Sign-Off
- QA owner: __________  Date: __________
- Product owner: ______  Date: __________
- Engineering lead: ____  Date: __________

## Follow-Up Items
- [ ] Document known issues in release notes.
- [ ] Create support KB article for new features.
- [ ] Schedule post-release review.
