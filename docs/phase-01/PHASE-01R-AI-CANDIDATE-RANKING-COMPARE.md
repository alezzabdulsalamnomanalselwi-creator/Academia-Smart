# Phase 1R — AI Candidate Ranking / Compare Validation

Date: 2026-09-02  
Project: `my-project-51bb7`  
Status: `COMPLETE`

## Outcome

Recruiter01 can now rank and compare candidates for its owned JOB-01 from the real Applications view. The score is deterministic, bounded to 0–100, and accompanied by a visible breakdown, strengths, gaps, missing skills, profile completeness, recommendation explanation, and candidate-specific interview questions. Cloud AI is optional; when absent or invalid the page uses `Smart Local` without blocking the workflow. AI does not write or transition any Application, Interview, Rating, or hiring decision.

## Initial contract and final disposition

| Capability | Initial | Final |
|---|---|---|
| Match Score | weak/arbitrary partial implementation | `IMPLEMENTED_WITH_LOCAL_FALLBACK` — deterministic 0–100 |
| Match Explanation | partial | `IMPLEMENTED_WITH_LOCAL_FALLBACK` |
| Strengths / Gaps | implemented, individual card only | implemented in ranking and compare |
| Missing Skills | partial/generic | explicit normalized list |
| Candidate Ranking | missing | stable descending ranking implemented |
| Candidate Compare | missing | responsive 2–3 candidate comparison implemented |
| Interview Questions | implemented, individual card | candidate/job/gap-aware questions in compare |
| Profile Completeness | partial | deterministic percentage implemented |

## Architecture and decision boundary

`ViewApplications.jsx` first queries positions owned by the authenticated Recruiter, then queries Applications only for those position IDs and enriches each candidate with its profile and Recruiter-owned rating. `CandidateRankingCompare.jsx` receives this already ownership-scoped dataset. When fewer than three real candidates exist, `buildPhase1rCandidateDataset` adds only clearly labeled in-memory TEST fixtures tied to the same owned position; it performs no Firestore/Auth write.

`analyzeCandidateHybrid` always calculates the local deterministic score, breakdown, and completeness first. A configured Cloud endpoint may enrich grounded narrative arrays only after schema validation; it cannot replace the score/breakdown. Missing endpoint, timeout, HTTP failure, or invalid response falls back to the same local result.

The UI states: “التقييم الذكي أداة مساعدة ولا يمثل قرار التوظيف النهائي.” There is no accept/reject button or status mutation in the AI component.

## Deterministic scoring

| Input | Maximum |
|---|---:|
| Subject / taught-course match | 25 |
| Department match | 15 |
| Academic qualification | 15 |
| Required skills match | 20 |
| Years / teaching experience | 10 |
| Profile completeness | 10 |
| Available evidence (CV/certificate) | 3 |
| Existing Recruiter rating | 2 |
| Total | 100 |

Normalization handles Arabic/English text, explicit skill lists, job requirements, and absent values. Missing fields remain explicit gaps; they are not replaced with invented qualifications, experience, skills, or ratings.

## Dataset and runtime UI evidence

- Real candidate: Lecturer01 / Application01 / JOB-01 / Rating01 = 4/5.
- Local TEST fixture: `Lecturer02 TEST`, marked “بيانات TEST محلية — غير محفوظة”.
- Local TEST fixture: `Lecturer03 TEST`, marked the same; deliberately contains weaker adjacent evidence for gap validation.
- No additional Auth account, user profile, Application, notification, or Production document was created.
- Real Recruiter UI ranking: Lecturer02 TEST 98%, Lecturer01 70%, Lecturer03 TEST 26%.
- Selecting two candidates reduced comparison to two; selecting the third restored three. Application01 remained `interview_scheduled` throughout.
- Null rating is rendered as “غير متوفر”, not `0/5`.

## Ranking and comparison UI

The Arabic RTL panel provides:

- ordered score cards with rank, score, provenance, completeness, rating, recommendation, and per-factor breakdown;
- selection of two or three candidates;
- side-by-side qualification, experience, skills, rating, strengths, gaps, missing skills, and interview focus;
- loading, error, empty, local-fallback, and TEST-data states;
- responsive single/three-column layout without horizontal document overflow in the validated desktop viewport.

## RBAC and ownership

- UI source query is restricted to positions where `postedBy.id` equals the signed-in Recruiter UID.
- Application rows are accepted only when their `positionId` is in that owned set.
- Ratings are queried using both `lecturerId` and authenticated `recruiterId`.
- Firestore Emulator targeted ownership test passed: owned read/update allowed; unrelated Application read/update and Recruiter-ID mutation denied.
- The ranking component is mounted only in the Recruiter Dashboard Applications section and creates no persistence surface for Lecturers.

## Validation

- Candidate AI Jest tests: **13/13 PASS**.
- Covered: deterministic scores, 0–100 bounds, breakdown sum, missing-data behavior, no hallucinated profile claims, stable ranking, compare output, Cloud schema rejection, Cloud narrative-only enrichment, Local fallback, null rating, 3-candidate TEST dataset, and no business-state mutation.
- Firestore Emulator targeted Recruiter Application ownership test: **1/1 PASS** on demo project `demo-academia-smart-phase1a`.
- Browser runtime: ranking/compare panel, 3 candidates, Smart Local provenance, score order, 2–3 selection, missing skills, questions, advisory disclaimer, and unchanged Application status: **PASS**.
- Production read-only preservation check: Recruiter/Lecturer active; JOB-01 open; Application01 `interview_scheduled`; Interview01 completed; Rating01 completed 4/5; `productionWrites=0`.
- Production build: **PASS with pre-existing non-blocking CRA/ESLint/Browserslist warnings**. A CI-mode build treats those pre-existing warnings as errors; the standard Production build succeeds.

## Defects corrected

1. Candidate scoring relied on a coarse token overlap and a base score rather than an auditable weighted contract.
2. Ranking, multi-candidate comparison, explicit missing skills, visible breakdown, and dedicated completeness score were absent.
3. Application enrichment omitted profile education/experience/skills/evidence and Recruiter-owned rating.
4. A null rating could be coerced to `0/5`; it now remains unavailable.
5. A future valid Cloud response could have replaced the deterministic score; Cloud is now restricted to narrative enrichment.

## Remaining AI gaps

- P1: Cloud AI still lacks a trusted authenticated backend, rate limiting, privacy/retention policy, and operational monitoring.
- P1: scoring weights and skill taxonomy need calibration with academic/recruitment reviewers before real hiring use.
- P1: TEST fixtures should be automatically unnecessary once three real owned applicants exist; no synthetic records were stored.
- P1: saved shortlists, comparison export, and audit of AI-assisted views are not implemented.
- P1: Smart Assistant entity/section awareness and document-note Rewrite/Shorten/Formalize actions remain separate work.

`REMAINING_P0=0`. `PHASE_1R_STATUS=COMPLETE`.
