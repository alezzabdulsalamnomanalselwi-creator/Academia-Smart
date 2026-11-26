# Phase 1I — Academic Seed Executor Build & Review

Status: `READY_FOR_CONTROLLED_PRODUCTION_SEED`  
Production Seed writes: `0`  
Production target: `my-project-51bb7` is guarded; no `--execute` was run against it.

## Scope and commands

The new executor is [`scripts/phase-01i-academic-seed.cjs`](../../scripts/phase-01i-academic-seed.cjs). It has no default write mode: no argument prints Help only. The supported modes are:

```text
node scripts/phase-01i-academic-seed.cjs --dry-run
node scripts/phase-01i-academic-seed.cjs --verify --project <projectId>
node scripts/phase-01i-academic-seed.cjs --execute --project <emulator-project>
node scripts/phase-01i-academic-seed.cjs --rollback --project <emulator-project>
```

In Phase 1I, `--execute` and `--rollback` require both Firebase Emulator environment variables. An attempt to execute with `--project my-project-51bb7` is deliberately stopped with `PRODUCTION_EXECUTION_REQUIRES_SEPARATE_APPROVAL` before Firebase services are initialized. A future, separately approved Production phase must retain the preflight and explicitly remove/review this temporary execution gate.

## Approved seed scope

Only the Phase 1H baseline is represented: **2 universities → 3 colleges → 4 departments → 6 subjects = 15 academic documents**. Jobs, accounts, Auth users, applications, files, interviews, notifications, ratings, audit logs, Rules, and Super Admin are outside this executor.

| Collection | Count | Stored fields |
|---|---:|---|
| `universities` | 2 | `name`, `active`, `createdAt` |
| `colleges` | 3 | `name`, `universityId`, `active`, `createdAt` |
| `departments` | 4 | `name`, `collegeId`, `active`, `createdAt` |
| `subjects` | 6 | `name`, `departmentId`, `code`, `active`, `createdAt` |

`subjects` deliberately does not store redundant `universityId` or `collegeId`; those are derived from `departmentId → collegeId → universityId`, matching the current UI data model.

## Preflight and duplicate strategy

Before a future first execution, the executor requires `projectId = my-project-51bb7`, exactly one active Super Admin profile, matching enabled Auth identity (outside Emulator), and clean academic counts: `0/0/0/0`. It blocks on any partial/non-planned academic state with `SEED_PRECHECK_BLOCKED` and a reason.

Idempotency uses normalized `name` plus immediate parent ID. A subject also has a unique code conflict check. An exact complete 2/3/4/6 re-run is the sole permitted non-empty state and must resolve to `SKIP_EXISTING`; any other count pattern blocks. The expected order is universities → colleges → departments → subjects, and each child uses the actual parent document ID found or created in that invocation.

The planned codes are `IT101`, `IT102`, `AI101`, `AI102`, `SUB101`, and `CS101`. `SUB101` is intentional for electrical engineering: current `makeSubjectCode` recognizes Arabic IT/AI/CS names, but strips the Arabic initials of `الهندسة الكهربائية`, so it falls back to `SUB`; no code-generator feature was changed.

## Verification, Rules, and rollback

`--verify` is read-only. It asserts 2/3/4/6 counts, active flags, parent relationships, no orphans, no duplicate normalized seed names, unique subject codes, and the six planned subject/code pairs.

`SEED_RULES_COMPATIBLE = TRUE`. The deployed/local `firestore.rules` grants `academic.manage` through `hasPerm`; `superAdmin()` satisfies `hasPerm` for university/college/department/subject create. The local Emulator harness passed the Super Admin Rules-path assertions for university, college, department, and subject creates.

Each future execution writes a local-only `local-manifests/phase-01i-seed-execution-manifest.json` with `seedBatchId`, project, timestamp, plan checksum, created IDs by collection, and skipped-existing IDs. It contains no password or secret. A re-run preserves the original created-ID inventory so it cannot replace it with an empty skip-only manifest.

`--rollback` is emulator-only in Phase 1I and deletes only IDs listed in that compatible manifest, in subjects → departments → colleges → universities order. It never targets `users`, Auth, `adminLogs`, or broad marker queries. Production rollback is design-only pending separate approval and a fresh backup.

## Test evidence

| Check | Result | Evidence |
|---|---|---|
| Syntax | PASS | `node --check` for executor and Emulator harness |
| No-mode safety | PASS | Help only; no service initialization/write |
| Dry Run | PASS | 15 records, dependency order, names, relationships, codes, duplicate strategy; `productionWrites: 0` |
| Production execute guard | PASS | `--execute --project my-project-51bb7` stopped with `PRODUCTION_EXECUTION_REQUIRES_SEPARATE_APPROVAL` before any Firebase call |
| Emulator runtime | PASS | Official Firebase CLI cache JAR SHA-256 and expected size matched; Firestore started on `127.0.0.1:8080`, Auth Emulator started on `127.0.0.1:9099`, Demo project only |
| Emulator execute / verify / second run | PASS | first execute created 15; verify passed; second execute created 0 and skipped existing 15 |
| Manifest-bound rollback / reseed | PASS | academic records became 0 after rollback; an unrelated `adminLogs` retention record remained; reseed created 15 and verify passed |
| Rules runtime assertion | PASS | authenticated Super Admin context could create each academic collection under current Rules |

The harness is [`scripts/phase-01i-academic-seed-emulator-test.cjs`](../../scripts/phase-01i-academic-seed-emulator-test.cjs). It passed Dry Run, execute, verify, second execution (`SKIP_EXISTING: 15`), manifest-bound rollback, reseed, verify, and Super Admin Rules-path checks against `demo-academia-smart-phase1i`; it created **zero Auth users**.

## Emulator incident resolution

The original report of a partial Firestore Emulator JAR was not confirmed. The default Firebase CLI cache file had the exact official expected size (`63,634,791` bytes) and SHA-256. The failed attempts combined an inaccessible default CLI `configstore` path under sandboxing with a newly forced temporary emulator-cache path, which caused a fresh download attempt every time and did not preserve the validated default cache. The fix was to isolate `XDG_CONFIG_HOME` locally while retaining the validated official cache, and to run the session with the installed Android Studio JDK 17. No Java 21 installation was found or needed for this Firebase CLI release; Firebase CLI emitted only its forward-looking Java-21 warning.

## Production readiness decision

`PRODUCTION_SEED_WRITES = 0`  
`PHASE_1I_PRODUCTION_EXECUTION = READY_FOR_CONTROLLED_PRODUCTION_SEED`  
`EMULATOR_EXECUTION_GATE = PASS`

Before a separately approved Production Seed, require a fresh Production backup, explicit `--project my-project-51bb7`, verified protected Super Admin/Auth assertions, `0/0/0/0` academic counts, approved execution manifest location outside ordinary checkpoints, and a manually reviewed Dry Run. No Production execution command is authorized by this document.
