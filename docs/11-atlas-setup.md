# Bachat Atlas setup and connection handoff

Status verified on 3 November 2026. Provisioned infrastructure and verified application connectivity are separate milestones.

## Provisioned resources

| Resource | Verified value |
|---|---|
| Organization | Ritik's Org - 2025-01-16 |
| Project | Bachat |
| Project ID | `6ae9c95ec8814c38d937b6d2` |
| Cluster | `bachat` |
| Tier | Free |
| Provider / region | AWS / Singapore (`AP_SOUTHEAST_1`) |
| Cluster state | Active in Atlas UI; IDLE and not paused in connector metadata |
| MongoDB version | 8.0.36 |
| SRV host | `bachat.qh1exix.mongodb.net` |
| Network access | One current-development IPv4 `/32` entry; no allow-all entry |
| Database users | None at last verification |
| Application connection / migrations | Pending |
| Managed backup | Off in Atlas UI; recovery requirements remain unverified |

Open the [Bachat Atlas project](https://cloud.mongodb.com/v2/6ae9c95ec8814c38d937b6d2#/overview). The earlier organization AI-client access restriction is resolved. The cluster was created without sample datasets or paid infrastructure.

The specific database-user and development-IP setup was approved by the owner. The connector nevertheless returned “User did not confirm” and performed neither operation. The approved IP addition subsequently succeeded through the authenticated Atlas dashboard and was independently verified through the connector. Database-user creation still returns that connector error. After the owner unlocked the Mac, the browser form was prepared with username `bachat_app`, all four scoped roles below, and access limited to the `bachat` cluster. The password is blank and the form has not been submitted; credential entry and submission are handed to the owner under browser security rules.

## Finish database credentials

In Bachat → Database & Network Access → Database Users, create a password-authenticated user named `bachat_app`, restricted to the `bachat` cluster. Configure these specific privileges:

| Database | Role | Purpose |
|---|---|---|
| `bachat_app` | `readWrite` | Application collections and transactions |
| `bachat_app` | `dbAdmin` | Migration indexes and collection validators |
| `bachat_control` | `readWrite` | Authoritative deletion-control records |
| `bachat_control` | `dbAdmin` | Control collection/index setup |

Do not select Atlas Admin or read/write access to every database. These migration-capable permissions are for initial setup. Separate migration/runtime principals can further reduce runtime permissions before public launch.

If using the browser, the owner must complete credential entry and submission. If using the connector, omit the password parameter so Atlas MCP securely generates it; do not generate a replacement in application code. Store credentials only in local/provider secret settings.

Set `MONGODB_URI` in the ignored repository-root `.env` file using the actual password. This is a non-secret template, not a working URI:

```text
mongodb+srv://bachat_app:<URL_ENCODED_PASSWORD>@bachat.qh1exix.mongodb.net/?retryWrites=true&w=majority&authSource=admin
```

Encode password characters for URI use. Keep `APP_DB=bachat_app` and `CONTROL_DB=bachat_control`. Do not replace or remove the existing local session-signing secrets. Do not paste the completed URI into chat, terminal arguments or commits.

## Verify before switching the application

1. Confirm the workstation's current public IP still matches the exact Atlas access entry. Update it explicitly if the ISP address changes. Render will need its own verified outbound network ranges; a workstation entry does not authorize Render.
2. Stop the local API before changing its database configuration. Preserve `.data/db` and all local records; changing the URI does not migrate them.
3. With `.env` configured, run `npm run db:migrate`. Record actual success or provider restrictions, especially validator/index permissions. Application databases are not considered created until this succeeds.
4. Start the API against Atlas. Verify readiness, a controlled synthetic account, exact transaction totals and budgets, owner isolation, session revocation, and atomic deletion/control-tombstone behavior. Never copy the local demo account into Atlas or run the local-only demo seeder against this host.
5. Record results in the verification report. Cluster Active status alone does not verify authentication, transactions, validators or application behavior.

## Remaining launch inputs

The existing `.env` file has dedicated fields for `MONGODB_URI`, `RESEND_API_KEY`, `MAIL_FROM` and `PRIVACY_CONTACT`. The latter three still require owner-supplied values. `MAIL_FROM` must use a sender verified with Resend; `PRIVACY_CONTACT` appears in published privacy copy and must be the operator's chosen public contact.

After database and email checks, deploy to the already-selected Render workspace and follow [deployment and recovery](09-deployment-and-recovery.md). Do not describe the free cluster as satisfying the backup, availability or performance launch requirements. No live email, public hosting, restore drill or billing has been verified by this Atlas setup.
