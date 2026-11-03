# Bachat deployment and recovery runbook

## Current boundary

The repository implements the core website and a local MongoDB-backed development environment. A hosting configuration is not a live deployment. No production database, email delivery, backup schedule or payment account is provisioned by this file.

User-confirmed Render workspace: **Ritik's workspace**, `tea-d8pqhvb6sc1c73d1dhmg`. Read-only discovery confirmed access. The earlier Atlas organization AI-access restriction has been resolved. A dedicated **Bachat** project and free **bachat** cluster have been provisioned in AWS Singapore; current development-IP access is configured. Database credentials, migrations and live database verification remain pending. See [Atlas setup status](11-atlas-setup.md) for the precise handoff. Never paste connection strings or API keys into chat or Git.

## Single-service Render path

`render.yaml` serves the compiled React app and API from one origin, avoiding a cross-site-cookie dependency. The documented Vercel/Render split remains an alternative below. No existing Render service is replaced.

The Blueprint selects Singapore and the free compute plan for initial setup. Cold starts and plan limits mean it is not evidence of the PRD availability/performance targets. Choose an appropriate always-on plan and verified backup arrangement before a paid public launch. No paid plan was purchased.

1. Ensure current GitHub CI passes and `render.yaml` is pushed to main.
2. Open [Create Bachat Blueprint](https://dashboard.render.com/blueprint/new?repo=https://github.com/Ritik0712-ai/Bachat) in the confirmed workspace. This link does not mean a service already exists.
3. Supply `MONGODB_URI` for an Atlas replica set with access limited to the deployment network, `RESEND_API_KEY`, `MAIL_FROM` for a verified sender, and `PRIVACY_CONTACT` for the actual operator contact. The DB account needs read/write plus collection/index/validator setup on the app/control databases; use a separate migration principal if least-privilege production operations require it.
4. Render generates independent 256-bit JWT/CSRF/rate-limit secrets. Do not regenerate them on every release. `RENDER_EXTERNAL_URL` supplies the same-origin public origin; set FRONTEND_ORIGIN explicitly when using a custom domain or separate frontend.
5. Build installs locked development tools and compiles client/server/scripts. Start applies named indexes/validators, then starts Express. Readiness checks database availability. The API binds to Render's PORT and 0.0.0.0.
6. Confirm actual deployment reaches live status, then perform the smoke sequence below. Do not open general registration to customers until live email, backup/restore, privacy and access checks pass.

Blueprint syntax was prepared against the current [Render Blueprint specification](https://render.com/docs/blueprint-spec), [compute-plan reference](https://render.com/docs/compute-plans) and [environment-variable rules](https://render.com/docs/configure-environment-variables). Structural validation against Render's public JSON schema does not replace platform validation or a live deployment.

## Vercel frontend + Render API alternative

Build the same repository on Vercel with `npm run build`, output `dist/client`. Add an external rewrite from `/api/:path*` to the **actual** Render API `/api/:path*` before the SPA fallback to `/index.html`. Keep every API response uncached. Set the API FRONTEND_ORIGIN to the exact Vercel/custom-domain origin. No wildcard CORS or token storage is needed. Preserve HttpOnly/secure/host-only cookies; verify Set-Cookie through the proxy. Do not commit a guessed backend hostname.

Use a separate API/database/secrets for preview deployments. Never authorize arbitrary preview origins against production accounts. Verify routing against [Vercel's rewrite reference](https://vercel.com/docs/routing/rewrites).

## Required smoke checks

- Readiness returns 200. Deep-link refresh on login, dashboard and child transaction routes returns the app.
- A controlled real mailbox receives verification and reset messages; invalid and consumed links fail safely.
- Signup, verification, sign-in, income/expense add, edit/delete and monthly limit all work with persisted records.
- Exact totals match a known synthetic fixture. Another account cannot read or change its entries.
- Session cookie is Secure/HttpOnly/SameSite=Lax/Path=/ with no Domain. Unsafe requests from a foreign Origin or without CSRF fail.
- Logout, logout-all and password reset revoke old sessions. Private/auth API responses are no-store and are not cached by a proxy/CDN.
- Production bundle contains no server secrets. Operational logs contain no financial payloads, notes, email, cookie or tokens.
- Review help/privacy for actual provider, contact and retention settings. Test mobile, keyboard and recovery paths.

Clean synthetic smoke accounts through normal controlled account deletion. Record release SHA, exact checks, provider result and remaining limitations separately from local CI evidence.

## Daily operations

Run `node dist/server/scripts/maintenance.js` daily through a configured scheduler with the required environment. It purges eligible unverified accounts and reports transaction-count mismatches without changing financial values. A nonzero mismatch result needs operator investigation. The scheduler is not provisioned by this repository; configure and test it before public launch.

Monitor readiness, 5xx/error codes and latency with provider/external tools. Configure meaningful alerts rather than logging sensitive payloads. Product analytics and session replay are disabled. Avoid collecting customer account identifiers in support screenshots.

## Backup and restore

Launch requirements: daily encrypted app backups, seven-day retention, RPO <=24 hours and RTO <=4 hours, verified on the chosen provider plan. Maintain current deletion-control records independently of app restore targets for 30 days. Provider snapshots and exports have distinct capabilities; do not assume a free Atlas plan supplies the required backup/restore behavior.

1. Restore the app backup into an isolated database/deployment, never over the live deletion-control DB.
2. Recover access to the authoritative current control database. If unavailable, keep restored traffic disabled. An old snapshot cannot prove which accounts were deleted afterward.
3. Set RESTORE_MONGODB_URI to the isolated target, RESTORE_APP_DB to its distinct database name, LIVE_CONTROL_MONGODB_URI to the current control source, CONTROL_DB to its actual name, and CONFIRM_ISOLATED_RESTORE=YES through secure environment settings.
4. Run `node dist/server/scripts/restore-scrub.js` (or `npm run restore:scrub` locally). It applies current deletion tombstones and invalidates restored sessions/account tokens. It never promotes traffic. Do not target active app data.
5. Apply current migrations, run count/reference checks, verify synthetic account isolation and exact fixtures, and record elapsed restore time.
6. Promote only after review. Retain a rollback route. If backup retention increases, increase deletion-control retention first.

The scrub utility is implemented. A real provider backup/restore drill and the operational RPO/RTO remain unverified until the provider environment exists.

## Rollback

Keep schema changes additive and rollback-compatible. Deploy the prior known-good application SHA if a release breaks a core flow; do not roll the database backward or resurrect deleted records. Stop new registration if access/recovery is unreliable. Keep audit/error evidence redacted. After repair, rerun auth, exact financial fixtures, isolation and live email smoke before reopening.
