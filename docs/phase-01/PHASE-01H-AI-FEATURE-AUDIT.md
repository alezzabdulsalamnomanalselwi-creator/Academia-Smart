# Phase 1H — AI Feature Audit (As-Is)

Status: originally a static code audit; updated after Phase 1R runtime validation. No AI feature makes an automatic hiring or document decision.

| Feature | Code evidence | Status | Cloud dependency | Local fallback | Role / page | Test required | Missing work |
|---|---|---|---|---|---|---|---|
| Smart Assistant | `src/components/shared/SmartAssistant.jsx` (`KB`, `ask`) | IMPLEMENTED | optional `REACT_APP_AI_API_URL`, task `assistant-help` | keyword/knowledge-base response | role from `users`; pathname hints | cloud success, timeout, local answer | durable page/entity context |
| Hybrid AI architecture | `src/services/aiService.js` (`analyzeCandidateHybrid`) | IMPLEMENTED | optional browser POST endpoint enriches narrative only | deterministic `analyzeCandidateLocal` owns score/breakdown | recruiter application review | endpoint/fallback provenance | backend contract, auth, governance |
| Cloud AI | `aiService.js`; `SmartAssistant.jsx`; `PostPosition.jsx` | PARTIAL | endpoint exists only as environment URL; no server implementation here | each caller falls back | candidate/assistant/job description | valid response, invalid response, timeout | authenticated backend, rate limits, logging, privacy policy |
| Local fallback | `aiService.js`; `SmartAssistant.jsx`; `PostPosition.jsx` | IMPLEMENTED | none | token overlap, KB matching, job template | candidate review, assistant, post job | force missing endpoint/timeout | richer Arabic semantic quality evaluation |
| Candidate match score | `analyzeCandidateLocal` | IMPLEMENTED_WITH_LOCAL_FALLBACK | cloud cannot replace deterministic score | 0–100 weighted score and visible breakdown | recruiter application ranking/cards | Phase 1R deterministic/boundary tests PASS | domain calibration with academic reviewers |
| Match explanation | `recommendation`, `strengths`, `gaps`, `breakdown` in `aiService.js` | IMPLEMENTED_WITH_LOCAL_FALLBACK | optional narrative enrichment | traceable rule-based Arabic explanation | recruiter ranking/compare | Phase 1R UI and input-grounding tests PASS | Arabic/English explanation quality evaluation |
| Strengths / gaps | `analyzeCandidateLocal`; `AcademiaSmartAI.jsx` | IMPLEMENTED | optional | rule-based arrays | recruiter application card | complete/incomplete profile cases | richer skill taxonomy |
| Interview questions | `questions` in `analyzeCandidateLocal`; UI `<details>` | IMPLEMENTED | optional cloud can replace | five templates | recruiter application card | subject/department variants | question editing/saving/evaluation workflow |
| CV/Profile completeness | `ViewPositions.jsx`; `analyzeCandidateLocal.profileCompleteness` | IMPLEMENTED | none | six-field deterministic completeness percentage | lecturer apply + recruiter ranking | missing/profile-complete fixtures PASS | optional verified-document extraction |
| Job description assistant | `PostPosition.jsx` `suggestJobContent` | IMPLEMENTED | optional task `job-description` | Arabic template description/requirements | recruiter post job | cloud success and fallback; human edit before publish | versioning, source/citation, quality controls |
| Candidate ranking / compare | `CandidateRankingCompare.jsx`; `phase1rCandidateFixtures.js`; `rankCandidatesLocal`; `compareCandidatesLocal` | IMPLEMENTED_WITH_LOCAL_FALLBACK | optional narrative enrichment | stable score sorting and responsive 2–3 candidate comparison | owned recruiter applications only | Phase 1R UI + unit + ownership Emulator tests PASS | optional saved shortlists/export; replace TEST fixtures when more real applicants exist |
| Document review-note AI | `ReviewDocuments.jsx`; `suggestDocumentReviewNoteHybrid`; `suggestDocumentReviewNoteLocal` | IMPLEMENTED_WITH_LOCAL_FALLBACK | optional `REACT_APP_AI_API_URL`, task `document-review-note` | metadata-only Arabic advisory note | recruiter document review | Phase 1O UI + fallback tests PASS | optional rewrite/shorten/formalize actions and authenticated Cloud governance |
| Missing skills | `requiredSkills`, `skillPresent`, `missingSkills` in `aiService.js` | IMPLEMENTED_WITH_LOCAL_FALLBACK | optional grounded narrative | explicit normalized requirement/profile comparison | recruiter ranking/compare | missing-data and no-hallucination tests PASS | expand controlled academic skills taxonomy |
| Page-aware assistant | `pageHints` checks a small route list | PARTIAL | page pathname is sent to cloud | route hint only | limited explicit routes; dashboards are internal state | route and dashboard-section tests | per-section/entity-aware context and deep-link recovery |
| Role-aware assistant | role loaded from `users/{uid}` and `KB[role]` | IMPLEMENTED | role sent to cloud | role-specific KB | lecturer/recruiter/admin | all four role cases incl. limited admin | permission-aware answer filtering |

## Count summary

- IMPLEMENTED / IMPLEMENTED_WITH_LOCAL_FALLBACK: **13**
- PARTIAL: **2**
- MISSING: **0**
- UI_ONLY: **0**

## Critical functional gaps

There is no P0 AI safety issue because the UI explicitly states that AI is advisory and does not automatically make a recruitment or document decision. Phase 1R implemented deterministic candidate scoring, ranking, comparison, explicit missing skills, interview focus, and completeness with Smart Local fallback. The highest remaining gaps are the authenticated/backend Cloud AI boundary, calibrated academic validation, richer page/entity context, and optional rewrite/shorten/formalize document-note actions.

## AI E2E acceptance cases for a future approved run

1. Candidate analysis with endpoint unavailable: local source badge, score, strengths, gaps, and questions render.
2. Candidate analysis with a valid cloud response: cloud source badge; narrative schema accepted while deterministic local score/breakdown remain authoritative.
3. Candidate analysis with invalid/timeout cloud response: no crash; deterministic local fallback.
4. Job description suggestion: recruiter reviews and edits before publishing; AI never publishes automatically.
5. Smart Assistant: role-specific answer, route hint, cloud timeout fallback, clear-session behavior.
6. Verify no AI feature writes application status, document review decision, rating, or interview outcome.
