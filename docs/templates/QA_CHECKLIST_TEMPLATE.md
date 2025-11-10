# QA Checklist Template

## Release Information
- Product version:
- Build date:
- Commit hash/tag:
- QA owner:
- Environment(s) tested:

## Smoke Tests
- [ ] Application launches without errors.
- [ ] Authentication/initialization completes.
- [ ] Core navigation loads expected plugins.
- [ ] Database/NAS connections succeed.
- [ ] Manual system opens and renders documentation.

## Functional Validation
| Area | Scenario | Result | Notes |
| ---- | -------- | ------ | ----- |
| Quote Configurator | Create quote from template |  |  |
| Quote Configurator | Duplicate legacy quote |  |  |
| Product Template Manager | Add template with IO fields |  |  |
| Global Component Search | Search by vendor number |  |  |
| BOM Importer | Import CSV (happy path) |  |  |
| Manual BOM Builder | Export spreadsheet |  |  |
| Settings | Update accent color/theme |  |  |

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
- [ ] Windows installer runs on clean VM.
- [ ] App adds desktop/start menu shortcuts.
- [ ] Uninstall leaves no residual data (besides user exports).

## Sign-Off
- QA owner: __________  Date: __________
- Product owner: ______  Date: __________
- Engineering lead: ____  Date: __________

## Follow-Up Items
- [ ] Document known issues in release notes.
- [ ] Create support KB article for new features.
- [ ] Schedule post-release review.
