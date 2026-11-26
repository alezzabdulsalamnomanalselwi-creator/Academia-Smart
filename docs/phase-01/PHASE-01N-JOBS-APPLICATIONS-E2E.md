# Phase 1N — Controlled Jobs & Applications E2E

## Final status

`PHASE_1N_STATUS=COMPLETE`

Production target: `my-project-51bb7`  
Execution date: 2026-09-01  
Scope: one existing Recruiter account, one existing Lecturer account, one synthetic CV, one academic job, and one application ending in `under_review`.

## Resume-state preflight

The read-only resume check found both test accounts enabled and active, no existing CV, no matching `JOB-01`, no `Application01`, and no related notifications. The existing academic hierarchy and protected Admin accounts were not modified.

## Production workflow result

| Check | Result | Evidence |
|---|---|---|
| Recruiter01 login | PASS | Real Firebase Authentication session and Recruiter Dashboard |
| Lecturer01 login | PASS | Real Firebase Authentication session and Lecturer Dashboard |
| Synthetic CV upload | PASS | Non-sensitive one-page PDF uploaded through the real profile uploader; profile prerequisite readback valid |
| JOB-01 publish | PASS | One open position, deadline `2026-12-31`, correct owner and University → College → Department → Subject links |
| Job duplicate check | PASS | Matching Production job count remained exactly one |
| Lecturer visibility | PASS | Browse Jobs displayed the exact job, hierarchy, deadline, and applied state |
| Application01 submit | PASS | Deterministic application ID; correct applicant/recruiter/position/university links; initial `pending`; no sensitive fields |
| Duplicate application protection | PASS | UI displayed `تم التقديم`, removed the apply action, and Production matching count remained one |
| Recruiter review | PASS | Owned application opened through the real Recruiter UI |
| Status transition | PASS | `pending → under_review` persisted; success flow stayed on the applications view |
| Lecturer synchronization | PASS | Track Applications displayed localized `قيد المراجعة` |
| Ownership/RBAC | PASS | Focused Demo Emulator tests passed 2/2 for Lecturer and Recruiter application ownership and immutable ownership fields |
| Notification persistence | PASS / read-state gap | Exactly one `new_position`, one `application`, and one `application_status`; correct recipients and unique event keys; fresh events started unread |
| Production build | PASS | Optimized build completed with pre-existing non-blocking CRA/ESLint/Browserslist warnings |

## Final Production state

- Positions: `1`; `JOB-01` is open and owned by Recruiter01.
- Applications: `1`; Application01 is `under_review` and linked to Lecturer01, Recruiter01, and `JOB-01`.
- Related notifications: `3`; all have the expected recipient/type and unique event keys. Opening Lecturer Notifications automatically marked its two visible events as read.
- Recruiter01 and Lecturer01 remain enabled and active.
- No Interview, Document Review, or Rating workflow was started.

## Defects corrected in scope

1. `PostPosition.jsx` could validate stale React state at submit time even when the visible native inputs were valid. The submit handler now creates one authoritative form snapshot and uses it for validation, persistence, and job notifications.
2. `ManagePositions.jsx` edited legacy `employmentType` while new jobs persist canonical `type`. Editing now reads/writes `type` and retains legacy read compatibility.
3. Application creation used a query-only duplicate check, leaving a concurrent duplicate race. The application now uses a deterministic `position + lecturer` document ID and returns the existing friendly result on a denied concurrent rewrite.
4. New application records omitted `universityId`, `submittedAt`, and `createdAt`. The canonical relationship/timestamps are now persisted.
5. Lecturer tracking exposed raw `under_review` and could not filter it. The localized label, color, and filter are now present.
6. The Recruiter job report/table and Lecturer job card relied on the stale `positions.applications` counter. Recruiter counts now come from owned application documents; the untrusted global count was removed from the Lecturer card.

No Firestore Rules change or Firebase component deployment was required.

## Notification/deep-link observation

The three workflow notifications were persisted correctly and started unread. Lecturer Notifications displays `new_position` and `application_status`, but rendering a card immediately writes `read=true` while leaving the legacy `status=unread`, and the cards do not execute their stored `deepLink`. Recruiter Notifications filters out the `application` type, so that event remains unread and invisible there. These read-state/deep-link gaps remain P1 because they did not block job submission or review.

## Guardrails

- No Super Admin, Limited Admin, Recruiter, or Lecturer role/status mutation.
- No new Auth identity.
- No Rules deployment, migration, Git/GitHub operation, Interview, Document Review, or Rating workflow.
- No password, token, private key, or other secret was written to source, documentation, or console output.

## Exit criteria

`PASS`: one valid job, one valid application, `under_review` synchronization, duplicate prevention, ownership enforcement, three idempotent notifications, and a successful Production build. The documented notification presentation/read-state gaps are non-blocking P1 items. Phase 1N is complete and the next phase requires separate authorization.
