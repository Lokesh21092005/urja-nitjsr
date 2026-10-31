# Security Review: Admin Score Protection

## Findings

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟠 HIGH | backend/src/middleware/auth.js | 17 | JWT authentication did not verify that the admin account still existed | 9/10 |
| 2 | 🟠 HIGH | backend/src/config/seedScores.js | destructive reset path | Score seeding deleted every production score record without confirmation | 10/10 |
| 3 | 🟡 MEDIUM | backend/src/config/seed.js | credential update path | Admin credentials were deleted before validation, risking administrator lockout | 9/10 |

## Remediation

- Protected requests now verify that the JWT admin ID still exists in MongoDB.
- `npm run seed:scores` no longer performs destructive deletion by default. A production reset requires explicit confirmation.
- Admin credentials are validated before database changes, and admins are recreated or updated safely.

## Result

Backend syntax checks and 18 backend tests passed after remediation. Existing production score data is protected from accidental score-seed resets unless an explicit confirmation is provided.
