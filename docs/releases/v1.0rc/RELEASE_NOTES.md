# Release Notes - v1.0rc

**Release Date:** November 7, 2025  
**Build Hash:** TBD (tag v1.0rc pending)  
**Distribution Package:** CraftToolsHub_Setup_v1.0rc.exe

## Highlights
- End-to-end overhaul of the Quote Configurator with instance-based assemblies and IO scoping.
- Unified manuals system with persistent URLs, vendor-number lookups, and Electron ES module compliance.
- New administrator documentation suite covering file locations, maintenance, and deployment scenarios.

## New Features
| Area | Description | Owner |
| ---- | ----------- | ----- |
| Quote Configurator | Multi-instance assemblies, optional sub-assembly toggles, and dynamic IO sections. | Engineering |
| Manuals System | Direct vendor-number search, URL persistence, and NAS/manual failover handling. | Engineering |
| Documentation | Added admin guides for deployment, maintenance, and file discovery. | Product Ops |

## Improvements
- Relocated the BOM Importer under the Products tab for better discoverability.
- Sanitized component catalogs to filter out zero-priced placeholder items before distribution.
- Added theme accent overrides so brand colors propagate across Tailwind utility classes.

## Bug Fixes
| Ticket/Ref | Summary | Validation |
| ---------- | ------- | ---------- |
| GC-142 | Search modal now respects focused text inputs and no longer swallows keystrokes. | QA pending |
| PTM-087 | Product Template Manager icons render consistently across card layouts. | QA pending |
| MAN-055 | Manual renderer no longer crashes due to legacy CommonJS `require` usage. | Build verification |

## Documentation Updates
- Refreshed `README.md` with the v1.0rc build workflow (pending final edit).
- Finalized administrator guides: `ADMIN_GUIDE_FILE_LOCATIONS.md`, `ADMIN_GUIDE_MAINTENANCE.md`, `ADMIN_GUIDE_DEPLOYMENT.md`.
- Added release collateral in `docs/releases/v1.0rc/` (QA log, deployment kit, rollback plan).

## Deployment Notes
- Installer must be code-signed with the company certificate prior to external distribution (friendly name: CraftAuto Signing Cert 2025).
- Supported OS: Windows 10/11 (x64). Minimum specs: 8 GB RAM, 2 GB free disk, NAS access over SMB.
- Post-install jobs:
	- copy `public/plugin_registry.json` to shared NAS path if central management is required.
	- set environment variable `CTH_RUNTIME_ROOT` to `\\192.168.1.99\CraftAuto-Sales\Temp_Craft_Tools_Runtime\updates\latest` on endpoints that should read/write shared exports.

## Known Issues
| Severity | Description | Workaround | Target Fix |
| -------- | ----------- | ---------- | ---------- |
| Medium | Jest unit tests are not wired; `npm run test` fails without global Jest binary. | Run `npm install --save-dev jest` before executing tests or skip until test suite authored. | v1.1 |
| Low | Initial launch warns about large renderer bundle sizes. | Accepted for v1.0rc; future work to split quote configurator chunk. | v1.1 |

## Validation Summary
- QA Checklist: [link](./QA.md)
- Smoke tests completed on: Pending (to be executed on QA VM)
- Regression suite status: Pending

## Acknowledgements
- Engineering: Quote Configurator & Manual System Teams
- QA: Assignment pending
- Product/Operations: CraftAuto Admin Desk

_Include this file in the GitHub release description and internal rollout communication._
