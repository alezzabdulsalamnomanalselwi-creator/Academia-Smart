# Phase 1U — Release Security & Durable File Storage Gate

Date: 2026-09-04  
Status: `COMPLETE — GRADUATION_RELEASE_GATE_PASS / PUBLIC_STORAGE_DEFERRED`  
Production writes: `0`

## Executive decision

The actually deployed application/runtime dependency surface now has `0 Critical / 0 High` findings under `npm audit --omit=dev`. Legacy CRA/Firebase CLI build and development tooling still contains advisories and is explicitly separated from the runtime result.

Durable Production document storage could not be activated safely. The configured Firebase Storage bucket does not exist, the project has no active billing account, and the existing Cloudinary private API credential is invalid. The current Local File API was left unchanged and secure; no public or unsigned fallback was introduced. Durable storage is therefore conditional for public deployment and explicitly safe to defer for the controlled local graduation demonstration.

## Rollback baseline

The pre-change rollback source is:

`Academia-Smart-PHASE-01T-full-ui-ux-redesign-20260904-1651-WIP.zip`

Dependency changes are confined to `package.json`, `package-lock.json`, and the local install graph. No Production data, Auth, Firestore Rules, or file metadata was mutated.

## Dependency audit — before

Command: `npm audit --omit=dev`

| Severity | Installed omit-dev result before classification |
|---|---:|
| Critical | 2 |
| High | 28 |
| Moderate | 21 |
| Low | 14 |

The initial omit-dev result was inflated because `react-scripts`, Tailwind/build helpers, CRA template, and `concurrently` were incorrectly listed as Production dependencies.

### Reachability classification

| Class | Packages/chains | Decision |
|---|---|---|
| `FIX_NOW_SAFE` | Reclassify `react-scripts`, `cra-template`, `tailwindcss`, and `concurrently` as development tools; patch/minor updates for React Icons, Tailwind forms, Autoprefixer, PostCSS, Tailwind | Applied |
| `FIX_NOW_TARGETED` | `websocket-driver <0.7.5` through Firebase packages; `path-to-regexp <0.1.13` through Express 4 | Safe patched overrides applied |
| `FRAMEWORK_TRANSITIVE` | SVGO/SVGR, Workbox, serialize-javascript, Jest/Babel, webpack-dev-server chains under CRA 5 | Deferred; build/test-only |
| `DEMO_ONLY / NOT_RUNTIME_REACHABLE` | `firebase-tools` chains including `tar`, `fast-uri`, CLI `ws`, glob/minimatch/js-yaml; Jest `form-data` | Dev/emulator/CLI only; excluded from deployed runtime |
| `REQUIRES_MAJOR_MIGRATION` | React Scripts replacement, Express 5, Firebase JS 12, React 19, Tailwind 4 | Not attempted in this phase |

Before the targeted fixes, the classified reachable server/client surface contained one Critical package (`websocket-driver`) and one High package (`path-to-regexp`). The critical Firebase Database transport is not imported by Academia Smart and the CRA findings are not shipped as server endpoints, but both reachable installed packages were patched rather than dismissed.

## Packages changed

| Package/change | Before | After | Reason |
|---|---:|---:|---|
| `react-icons` | 5.4.0 | 5.7.0 | compatible minor |
| `@tailwindcss/forms` | 0.5.10 | 0.5.11 | compatible patch |
| `autoprefixer` | 10.4.20 | 10.5.5 | compatible minor |
| `concurrently` | runtime dependency, 9.2.4 installed | dev dependency, 9.2.4 | startup/build orchestration only |
| `postcss` | 8.4.49 | 8.5.28, dev | fixes direct PostCSS advisories |
| `tailwindcss` | 3.4.17 range/runtime | 3.4.19, dev | compatible patch; build tool only |
| `react-scripts` | runtime dependency | dev dependency, unchanged 5.0.1 | legacy build/test tool only |
| `cra-template` | runtime dependency | dev dependency, unchanged 1.2.0 | scaffolding only |
| `path-to-regexp` | 0.1.12 | 0.1.13 override | Express 4-compatible security patch |
| `websocket-driver` | 0.7.4 | 0.7.5 override | security patch without Firebase major upgrade |

The Cloudinary SDK was evaluated and then removed because the configured private API credential returned `401`; no unused provider dependency remains.

## Dependency audit — after

### Runtime/deployed graph

| Severity | Result |
|---|---:|
| Critical | 0 |
| High | 0 |
| Moderate | 9 |
| Low | 0 |

The nine moderate rows are Express 4 / `body-parser` / `qs` and Firebase Admin optional Google Cloud Storage request chains. The direct packages are already at the latest compatible major currently used by the project; npm proposes Express 5 or an invalid Firebase Admin downgrade path. Existing input size limits, rate limits, strict upload validation, authentication, and ownership controls reduce exposure. These moderate findings require a controlled major-upgrade phase, not a forced audit rewrite.

### Full install graph including dev/build tools

| Severity | Result |
|---|---:|
| Critical | 2 |
| High | 25 |
| Moderate | 24 |
| Low | 14 |

The two Critical dev findings are `form-data` in the Jest/jsdom tree and `tar` under Firebase CLI. High findings are concentrated in CRA 5 and Firebase CLI transitive tooling. They are not part of the deployed browser bundle or Local File API runtime, but remain a legacy build-machine risk. Use a trusted build workstation, do not process untrusted build input, and replace CRA/update the CLI in a separately approved migration.

## Current storage architecture

```text
Lecturer browser
  -> Firebase ID token
  -> POST Local File API /api/files/upload
  -> Multer 25 MB / one file
  -> extension + MIME + magic signature validation
  -> server/uploads/<lecturerUid>/<category>/<random-name>
  -> Firestore documents metadata (fileURL/storagePath/owner/recruiter/application)

Authorized read
  -> protected Local File API route
  -> verifyIdToken(checkRevoked=true)
  -> active Firestore profile
  -> owner / assigned recruiter / authorized admin check
  -> private response with nosniff
```

Current role: `secure proxy + legacy local storage provider`. It is suitable for the controlled local demonstration, not durable public hosting.

### Metadata and ownership contract

- `documents.userId` is the Lecturer owner.
- `documents.recruiterId` identifies the assigned reviewer.
- `applicationId`, `positionId`, and `jobId` preserve workflow ownership.
- `storagePath`, `fileURL`, `fileName`, `fileType`, and `fileSize` are backward-compatible Local File API metadata.
- The server derives the owner from the authenticated token/path and never accepts client-supplied authorization.
- Anonymous access is denied; unrelated users are denied; 25 MB, extension, MIME, and file-signature checks remain active.

Legacy Google Drive/public URLs and old Cloudinary profile-image uploads exist in UI/data history. They were not treated as a secure document-storage provider and were not migrated.

## Durable provider evaluation

### Firebase / Google Cloud Storage

- Configured bucket name matches `my-project-51bb7`, but metadata lookup returned `404`.
- Firebase CLI account can access the project and confirmed bucket count `0`.
- Firestore location is `nam5`; the intended private document bucket location was therefore `US`.
- The proposed bucket used Standard storage, versioning, Uniform Bucket-Level Access, Public Access Prevention, and no public ACL.
- Creation through the official Google Cloud Storage API failed with `403`: the owning project billing account is absent/disabled.
- No bucket or object was created.

### Existing Cloudinary configuration

- Cloudinary is already referenced for legacy profile-image uploads.
- A server-authenticated private provider check returned `401`.
- Unsigned/public upload presets cannot satisfy application RBAC or protected download requirements.
- The SDK evaluation was rolled back and no document was uploaded.

## Required durable implementation after the blocker is cleared

The preferred implementation remains a private Google Cloud Storage bucket in the same Firebase project:

1. Enable a billing account for `my-project-51bb7`.
2. Create the document bucket in `US`, matching Firestore `nam5`, with uniform access, public access prevention, and versioning.
3. Use Firebase Admin/Google Cloud Storage only on the Local File API.
4. Change the API into an authenticated upload orchestration and secure download proxy.
5. Add only `storageProvider` and durable `storagePath` fields; retain `fileURL` as the protected API route.
6. Keep existing `Document01` and all local files as `LOCAL_LEGACY`; route only new files to `DURABLE_NEW`.
7. Return an explicit provider-unavailable error and never silently fall back to public storage.
8. Run the required Lecturer/Recruiter/anonymous/unrelated E2E matrix before changing the gate.

No code for an untestable provider was added in this phase.

## Regression and preservation evidence

| Gate | Result |
|---|---|
| React suites | 6/6 suites, 51/51 tests PASS |
| Server/API security | 11/11 PASS |
| Auth, upload endpoint anonymity, CORS, 25 MB, MIME/signature | PASS in server security suite |
| Optimized CI build | PASS |
| Super Admin | enabled, active, explicit/protected — PASS |
| Limited Admin | enabled, active, exact permissions retained — PASS |
| Recruiter01 / Lecturer01 | enabled and active — PASS |
| JOB-01 / Application01 / Document01 / Interview01 / Rating01 | all present and valid — PASS |
| Ownership/orphan/duplicate scan | zero core orphans and zero critical duplicates |
| Production writes during preservation scan | 0 |

Storage E2E, unrelated-user durable access, notification impact, and AI document-review durable access were not claimed: no compliant durable provider could be provisioned.

## Release decision

- `DEPENDENCY_RUNTIME_GATE=PASS`
- `BUILD_TOOL_SECURITY_GATE=CONDITIONAL_LEGACY`
- `DURABLE_STORAGE_GATE=CONDITIONAL`
- `DURABLE_STORAGE=SAFE_TO_DEFER_FOR_GRADUATION_DEMO`
- `FINAL_PUBLIC_DEPLOY_GATE=NOT_READY`
- `GRADUATION_LOCAL_DEMO_GATE=READY`
- `REMAINING_P0=0`
- `PHASE_1U_STATUS=COMPLETE — GRADUATION_RELEASE_GATE_PASS / PUBLIC_STORAGE_DEFERRED`
