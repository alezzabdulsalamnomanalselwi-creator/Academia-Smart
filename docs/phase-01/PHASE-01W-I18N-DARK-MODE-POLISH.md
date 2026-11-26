# Phase 01W — I18N Consistency and Theme Foundation

## Architecture

- `LanguageContext` remains the single source for `ar` and `en`, persisted as `app_language`; it updates `html[lang]` and `dir` without a refresh.
- Static UI text belongs to locale dictionaries. Status display is centralized in `src/utils/displayLabels.js`; it does not alter the stored status value.
- User-entered and system entity data (names, emails, academic entities, job titles, notes, comments, and filenames) remains displayed exactly as stored.
- `ThemeContext` persists `light`, `dark`, or `system` as `academia_smart_theme`, resolves System through `prefers-color-scheme`, and updates when the operating-system preference changes.

## Visual scope

- Light preserves the approved Phase 1T appearance.
- Dark uses design tokens for surfaces, text, borders, form controls, tables, dashboard shells, and the Smart Assistant.
- Theme controls are available in shared dashboard and authentication headers with accessible menu semantics.

## Validation

- Targeted presentation tests cover bilingual status display and Light/Dark/System resolution.
- Existing Smart Assistant tests continue to cover role/page/session isolation; language-specific assistant prose remains a legacy expansion area where components still contain historical hardcoded content.

## Final Admin presentation cleanup — 2026-09-05

- Completed the remaining AdminDashboard presentation-only copy migration for Add Admin, Edit Account, logout, account status/action feedback, permission captions, audit headings/pagination, and academic/system diagnostics.
- Audit raw actions, permission keys, account status values, entity names, emails, and user-entered data remain unchanged; only their display captions are localized.
- Admin static-string scan classification: translation dictionary and `tr(ar, en)` branches are valid; dynamic/user data, technical keys, and identifiers are intentionally preserved. No Admin user-facing static Arabic copy remains in English mode, and no Admin user-facing static English copy remains in Arabic mode.
- Validation: targeted Jest suites 27/27 PASS; `CI=true npm run build` PASS.

`PHASE_01W_STATUS=COMPLETE — I18N_AND_THEME_POLISH_PASS`.
