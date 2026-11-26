# Phase 1G — Controlled Firestore Rules Production Deploy

Date: 2026-08-31  
Project: `my-project-51bb7`  
Final status: `PHASE_1G_STATUS = COMPLETE`

## Scope and guardrails

This phase deployed only `firestore:rules`. It did not deploy Hosting, Functions, Storage, indexes, or any other Firebase component. It did not create Seed Data, mutate Firebase Auth, modify Production documents, run a migration, change `.firebaserc`, use Git/GitHub, or expose any credential, token, SCRYPT parameter, password hash, or private key.

Every Firebase CLI Production command used both `--project my-project-51bb7` and the explicitly selected authorized account. The different CLI default account was not used for Production operations. Firebase CLI version: `14.27.0`.

## Pre-deploy state and assertions

| Assertion | Result |
|---|---|
| Production project | `my-project-51bb7` — VERIFIED |
| Emulator targeting active | FALSE |
| Restore readiness | `RESTORE_READY_FOR_TEST_DATA_RESET` |
| Firestore restore validation | 294/294 PASS |
| Auth structural restore validation | 14/14 PASS |
| Password Hash configuration | PRESENT and VALID |
| Auth users | 1 |
| Firestore users | 1 |
| Super Admin Auth present/enabled | TRUE / TRUE |
| Super Admin users document present | TRUE |
| Super Admin role/admin level | valid / `super` |
| Super Admin blocked | FALSE |
| Historical plaintext-password records | 0 |

## Rollback source

The previously deployed Production rules were captured before deployment in the local sensitive backup area and excluded from all ordinary project ZIP files.

| Artifact | Result |
|---|---|
| Rollback rules backup | PASS |
| Old Production Rules SHA-256 | `9B8C04446F4D7FE4B19F36807C79A56FC2A8882467E92752FFFFE83F335FD0A9` |
| Rollback manifest SHA-256 | `A0D1C1034DF2D5687127B83157FE8F799B627E0C31404FCC3D41896C7D510ED8` |
| Phase 1F backup manifest SHA-256 | `6652023E2B9B6392D53AB497D4E4BE2C3B6D9426B049A72181626CEBE8234EB7` |
| Rollback readiness | READY |

## Pre-deploy validation

| Gate | Result |
|---|---|
| Security/static + Auth/Firestore/File Emulator suite | 30/30 PASS |
| Previously validated full Phase 1A matrix including React tests | 33/33 PASS |
| Production build | PASS with known non-blocking CRA/ESLint/Browserslist warnings |
| Local `firestore.rules` SHA-256 | `F7203F6A38BB7060AE1C14903890477C630870AC9B434BE01DA42D68A15FBBA7` |
| `.firebaserc` SHA-256 unchanged | `C2F97ADEC9504B58900B62658E000EEAB5CFA588A1D62A057F0EF31403A5B13C` |

## Controlled deployment

The controlled command shape was:

```text
firebase deploy --only firestore:rules --project my-project-51bb7 --account <AUTHORIZED_ACCOUNT>
```

Firebase compiled the local rules successfully, uploaded only `firestore.rules`, and released them to `cloud.firestore`. The active ruleset was created at `2026-08-30T23:12:17.506767Z` and the active release was updated at `2026-08-30T23:12:18.791433Z`.

`FIRESTORE_RULES_DEPLOY = PASS`

## Post-deploy verification

The active rules source was read back using a read-only API and normalized before comparison.

| Check | Result |
|---|---|
| Deployed Rules match local Rules | TRUE |
| Anonymous read `users` | DENIED |
| Anonymous read `adminLogs` | DENIED |
| Anonymous read arbitrary collection | DENIED |
| Anonymous arbitrary write authorization | DENIED |
| Public Firestore read | DENIED |
| Public Firestore write | DENIED |
| Authenticated arbitrary non-admin access | NOT TESTED — no normal Production test identity was created |

The anonymous write check attempted deletion of a guaranteed-nonexistent sentinel document, so the authorization path was exercised without creating or changing Production data.

## Super Admin and UI smoke validation

The user completed the required manual validation after deployment, and the remaining read-only pages were verified against the existing authenticated Chrome session.

| Smoke check | Result |
|---|---|
| Super Admin Login | PASS |
| Admin Dashboard | PASS |
| Accounts/Permissions | PASS |
| Protected Super Admin visible | PASS |
| Users Count | 1 |
| Unexpected Permission Denied | NONE |
| Audit Log page | PASS — opened and displayed 86 operations |
| Join Requests page | PASS — empty state displayed |
| Academic Report page | PASS — opened with empty academic data |

## Clean Production state after deployment

| Collection/entity | Count |
|---|---:|
| Firebase Auth users | 1 |
| Firestore users | 1 |
| adminLogs | 86 |
| recruiterRequests | 0 |
| applications | 0 |
| documents | 0 |
| interviews | 0 |
| ratings | 0 |
| notifications | 0 |
| adminNotifications | 0 |
| jobs | 0 |
| positions | 0 |
| universities | 0 |
| colleges | 0 |
| departments | 0 |
| subjects | 0 |

All other checked reset-target collections also remained zero. No test record or probe document was created.

## Rollback decision

`ROLLBACK_EXECUTED = FALSE`

No rollback trigger occurred: the deployed rules match local rules, public access is denied, Super Admin retained access, the UI smoke checks passed, and Production counts were preserved.

## Final security status

```text
P0_FIRESTORE_PUBLIC_ACCESS = CLOSED
HISTORICAL_PLAINTEXT_PASSWORD_P0 = CLOSED
REMAINING_P0 = 0
PHASE_1G_STATUS = COMPLETE
```

Remaining P1 work is tracked separately: external/provider file ownership and backup policy, Production File API configuration, dependency vulnerabilities/toolchain modernization, removal of the legacy admin compatibility fallback, and trusted/atomic audit mutation architecture.

Seed Data and Phase 2 were not started.
