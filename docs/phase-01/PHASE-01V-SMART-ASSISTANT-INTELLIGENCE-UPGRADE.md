# Phase 1V — Smart Assistant Intelligence Upgrade

## Scope and result

The Smart Assistant is now a deterministic, role-aware and page-aware guide. It remains advisory: it cannot perform a write, make a hiring decision, change RBAC, or access data beyond the active user's permitted Firestore reads.

## Context architecture

```
Firebase session + own profile + current URL
  → role / effective permissions / page / query entity
  → ownership filter + safe entity projection
  → intent detection + deterministic Smart Local response
  → optional Cloud narrative only when configured
```

- Roles: Super Admin, Limited Admin, Recruiter, Lecturer, and unauthenticated common mode.
- Page context: dashboard, jobs, applications, documents, interviews, ratings, notifications, profile, and admin surfaces.
- Entity context: only an ID carried by the current URL is read; the entity must match the actor's relationship before a minimal safe projection is used.
- The assistant receives only own-profile completeness, own unread count, page metadata, and approved entity fields. Recruiter-only matching/ranking fields are never projected to Lecturer context.

## Smart Local and Cloud

Smart Local is the default and works with no Cloud configuration. It combines intent detection, role/permission filtering, page state, safe entity fields, profile completeness, and deterministic workflow guidance. Missing data is stated as missing; it is not invented.

When `REACT_APP_AI_API_URL` is configured, Cloud receives a minimal safe context and explicit guardrails: no RBAC bypass, no autonomous action, and no hiring decision. It can provide a short narrative only. It cannot replace the deterministic score/breakdown algorithms. Any Cloud failure automatically returns Smart Local.

## Privacy and session isolation

- Chat history is namespaced to `academia_assistant_session:<uid>`.
- A logout or account switch loads only that owner’s history; anonymous history is independent.
- Limited Admin responses describe only its real report/audit capabilities.
- The assistant does not expose internal recruiter notes, other recruiter data, or recruiter-only ranking details to lecturers.

## UI

The approved Phase 1T visual baseline is retained: floating launcher, navy/blue panel, RTL, role/page badges, local/cloud indicator, contextual suggestion chips, one non-intrusive insight, accessible live answer area, and compact loading dots.

## Validation

- `SmartAssistant.test.js`: 12/12 PASS — roles, permissions, pages, entity context, missing-data behavior, role isolation, troubleshooting, and UID session isolation.
- `aiService.test.js`: 13/13 PASS — existing deterministic match/ranking/compare and document-note fallback preserved.
- `CI=true npm run build`: PASS.
- Visual baseline check on the local login surface: PASS. The live Recruiter01 and Lecturer01 role walkthrough remains pending a user-held authenticated session; no credentials were entered or exposed by the validation process.

## Limitations

- Cloud AI is not configured and remains a P1 optional backend/governance task.
- Entity context is intentionally URL-scoped; it does not inspect arbitrary records or component-private state.
- The assistant explains actions but does not execute them.
