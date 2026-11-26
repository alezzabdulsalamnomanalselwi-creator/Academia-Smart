# Phase 1E — Reset Manifest — Executed

**Execution status:** `PHASE_01E_CONTROLLED_PRODUCTION_RESET_PASS`  
**Clean target assertions:** `PASS`  
**Firestore deleted:** 208  
**Auth deleted:** 13  
**Protected Super Admin:** PRESERVED  
**External files deleted:** NO  
**Rules deploy / Seed:** NOT RUN

## Executed Result

| Stage | Scope | Pre | Deleted | Post | Result |
|---|---|---:|---:|---:|---|
| D1 | leaf activity | 108 | 108 | 0 | PASS |
| D2 | interviews/documents/verifications | 41 | 41 | 0 | PASS |
| D3 | applications | 8 | 8 | 0 | PASS |
| D4 | positions/jobs/recruiter requests | 22 | 22 | 0 | PASS |
| D5 | academic hierarchy | 18 | 18 | 0 | PASS |
| D6 | Firestore test users | 12 | 11 | 1 protected | PASS |
| D7 | Firebase Auth test users | 14 | 13 | 1 protected | PASS |
| K1 | `adminLogs` | 85 | 0 | 86 after reset audit | PASS |

The detailed result and per-collection readbacks are recorded in `PHASE-01E-TEST-DATA-RESET-RESULT.md`.

## Approved Dry-run Baseline

| Stage | Collection/Auth | Current Count | Keep Count | Delete Count | Protected IDs Count | Risk | Rollback Ready YES/NO |
|---|---|---:|---:|---:|---:|---|---|
| K0 | Protected Super Admin identity | 1 identity | 1 | 0 | 1 | Critical | YES |
| K1 | `adminLogs` | 85 | 85 | 0 | 0 | High evidence-retention | YES |
| K1 | `auditLogs` | 0 | 0 | 0 | 0 | Low | YES |
| D1 | `notifications` | 94 | 0 | 94 | 0 | High | NO |
| D1 | `adminNotifications` | 6 | 0 | 6 | 0 | Medium | NO |
| D1 | `ratings` | 8 | 0 | 8 | 0 | Medium | NO |
| D2 | `interviews` | 10 | 0 | 10 | 0 | High | NO |
| D2 | `documents` metadata | 7 | 0 | 7 | 0 | High | NO |
| D2 | `verifications` | 24 | 0 | 24 | 0 | Medium | NO |
| D3 | `applications` | 8 | 0 | 8 | 0 | High | NO |
| D4 | `positions` | 13 | 0 | 13 | 0 | High | NO |
| D4 | `jobs` | 0 | 0 | 0 | 0 | Low | YES |
| D4 | `recruiterRequests` | 9 | 0 | 9 | 0 | P0 sensitive-field containment | NO |
| D5 | `subjects` | 3 | 0 | 3 | 0 | Medium | NO |
| D5 | `departments` | 5 | 0 | 5 | 0 | Medium | NO |
| D5 | `colleges` | 5 | 0 | 5 | 0 | Medium | NO |
| D5 | `universities` | 5 | 0 | 5 | 0 | High | NO |
| D6 | Firestore `users` | 12 | 1 | 11 | 1 | Critical | NO |
| D7 | Firebase Auth users | 14 | 1 | 13 | 1 | Critical / hard rollback | NO |
| D1 | `savedJobs` | 0 | 0 | 0 | 0 | Low | YES |
| D1 | standalone recruiter-interest collection | 0 | 0 | 0 | 0 | Low | YES |
| TOTAL-FIRESTORE | All discovered Firestore documents | 294 | 86 | 208 | 1 | Critical | NO |
| TOTAL-AUTH | Firebase Auth users | 14 | 1 | 13 | 1 | Critical | NO |
| TOTAL-DELETE | Firestore + Auth deletion operations | 308 layer records | 87 | 221 | 1 unique protected identity | Critical | NO |
