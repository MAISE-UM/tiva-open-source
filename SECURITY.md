# Security policy

## Reporting a vulnerability

Please report security problems privately, not in a public issue or pull request. Use GitHub's private vulnerability reporting for this repository (Security tab, "Report a vulnerability").

Include what you found, the steps to reproduce it, and the version or commit. Do not include real patient data in a report.

## Scope

TIVA handles clinical data and signs users in, so the following are in scope:

* Authentication and authorization bypass (JWT/refresh tokens, roles, EHR and LDAP sign-in)
* Access to another user's session or data
* SQL injection or other injection in the API
* Exposure of patient data or secrets, for example through logs or error messages

## Deploying securely

* Keep `Environment` and `ASPNETCORE_ENVIRONMENT` at `Production` on every real server. `Environment=Development` lets test accounts sign in without a password.
* Keep `appsettings.json`, `web.config`, `.env` and the `keys/` folder out of source control, and restrict read access on the server.
* Run the API as a single instance and serve everything over HTTPS (see [api/README.md](api/README.md)).
* TIVA is not a medical device and is not validated for clinical use (see the disclaimer in the [README](README.md)).
