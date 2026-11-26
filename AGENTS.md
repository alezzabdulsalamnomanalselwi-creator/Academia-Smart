# Standing Execution Authorization

Within an explicitly approved current project phase, the agent has standing authorization to perform the technical actions needed to complete that phase, including:

- create, edit, or remove code files required by the approved scope;
- fix directly related bugs;
- run tests, builds, emulators, and verification tools;
- install trusted dependencies, SDKs, CLIs, runtimes, and tools;
- create, update, or remove Firebase Production **test data** required by the approved tests;
- create and update test accounts;
- run block/unblock, permission-change, and RBAC tests on explicitly scoped test accounts;
- run approved scripts, migrations, and verification tools;
- update documentation and create local ZIP checkpoints.

Do not request routine approval again for actions already inside the approved phase. Stop and request user intervention only when manual input cannot be automated, required information cannot be inferred safely, or an unexpected risk appears outside the approved scope.

## Fixed safety boundaries

- Never delete, disable, or weaken the protected Super Admin.
- Never damage or delete approved backups.
- Never reveal passwords, tokens, private keys, service-account credentials, or other secrets.
- Require a verified backup and rollback path before any broad destructive Production operation.
- Do not use GitHub.
- Product-level standing authorization does not override mandatory platform or tool safety confirmations.
