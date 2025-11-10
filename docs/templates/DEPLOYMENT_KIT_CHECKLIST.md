# Deployment Kit Checklist

## Package Contents
- [ ] Signed installer (`CraftToolsHub_Setup_{{VERSION}}.exe`).
- [ ] Checksum file (`CraftToolsHub_Setup_{{VERSION}}.sha256`).
- [ ] Release notes (`docs/releases/{{VERSION}}/RELEASE_NOTES.md`).
- [ ] Admin deployment guide (`ADMIN_GUIDE_DEPLOYMENT.md`).
- [ ] File locations guide (`ADMIN_GUIDE_FILE_LOCATIONS.md`).
- [ ] Maintenance guide (`ADMIN_GUIDE_MAINTENANCE.md`).
- [ ] Quick-start cheat sheet (PDF/one-pager).
- [ ] Rollback instructions (`docs/releases/{{VERSION}}/ROLLBACK.md`).

## Pre-Deployment
- [ ] Confirm target environment specs (OS, RAM, disk, network).
- [ ] Validate antivirus exclusions documented.
- [ ] Ensure NAS share paths accessible for manuals and exports.
- [ ] Notify stakeholders of maintenance window.
- [ ] Back up existing installation directories and data exports.

## Deployment Steps
- [ ] Install on staging/QA machine and run smoke tests.
- [ ] Capture screenshots or recording of install flow.
- [ ] Deploy to pilot group (list recipients, dates).
- [ ] Collect feedback and address high/medium issues.
- [ ] Approve rollout to production fleet.

## Training & Communications
- [ ] Announce release via email/Teams with key highlights.
- [ ] Publish LMS module or video walkthrough for users.
- [ ] Schedule live Q&A/office hours session.
- [ ] Provide help-desk script and escalation matrix.
- [ ] Distribute onboarding kit to new employees.

## Post-Deployment
- [ ] Monitor logs/error reports for 72 hours.
- [ ] Track support tickets in shared dashboard.
- [ ] Validate backups job status after go-live.
- [ ] Document lessons learned and add to retro notes.
- [ ] Update roadmap with follow-up enhancements.
