# V4 campaigns — mailbox journey fixture contract (CJ-02 → root, CJ-05)

Lot CJ-02, branch `feat/claude-hermes-complete-campaign-api`. This declares a **new integration
suite** and what CI must provide for it to execute. **It has never been executed** — see
"Execution status" below, which is the most important section of this document.

## Files

| Path | Role |
| --- | --- |
| `apps/crm/ui/packages/twenty-server/test/integration/graphql/suites/hermes-campaign-mailbox-journey.integration-spec.ts` | The suite. |
| `apps/crm/ui/packages/twenty-server/test/integration/utils/hermes-campaign-mailbox-fixture.util.ts` | Its dedicated mail-server fixture. |

Both are new. CJ-02 touched no connections code, no CI script and nothing in the frontend.

## For CJ-05 — what must be declared and provided

### 1. Declare the suite, or a combined run silently skips it

The suite path is **not** discovered by globbing. `postgres-legacy` runs a fixed list, so the
path above must be added to the declaration array CJ-05 maintains — reported to me as
**`BACKEND_EXTRAS`** in `scripts/check-hermes-v4-combined.mjs`, plus its companion
`check-hermes-v4-combined.test.mjs` if that asserts on the list.

**I could not verify the array name myself: `scripts/` and `.github/` do not exist in this
worktree** (only `apps/`, `docs/`, a dead `docker-compose.yml` stub and some loose files). CJ-05
owns that file and should use whichever array its own guard now enforces by name. The filename
was chosen to satisfy the existing validator, which I did verify:

```
/^test\/integration\/graphql\/suites\/hermes-[a-z0-9-]+\.integration-spec\.ts$/
```
`hermes-campaign-mailbox-journey.integration-spec.ts` matches (lowercase and hyphens only).

### 2. Two environment values the suite requires, and asserts up front

The suite does **not** override config — it reads and asserts, so a wrong provider fails loudly
instead of quietly proving nothing. Both values must be in the integration child environment's
allowlist:

| Variable | Required value | Why |
| --- | --- | --- |
| `EMAILING_DOMAIN_DRIVER` | `SMTP` | The runner currently hardcodes `LOG`. Under `LOG` nothing reaches a socket, so the capture step cannot work and the suite will refuse to start. |
| `IMAP_SMTP_ALLOW_SELF_SIGNED` | `true` | The fixture serves a self-signed certificate. This flag is the product's own switch feeding `rejectUnauthorized` in `buildMailServerCertificateOptions`; no guard is modified. |

**RESOLVED after the first red run — a third variable is required.** The suite originally set
the SSRF allowlist at runtime with `updateConfigVariable`. That helper writes through the
admin-panel API into database-backed config, and the runner sets
`IS_CONFIG_VARIABLES_IN_DB_ENABLED=false`, so the mutation had nothing to write to and every test
failed in `beforeAll`. The suite no longer calls it. Instead:

| Variable | Required value | Why |
| --- | --- | --- |
| `OUTBOUND_HTTP_ALLOWED_INTERNAL_HOSTS` | `localhost,127.0.0.1` | The SSRF guard must reach the fixture. The suite now **asserts** the host is listed and refuses to run otherwise. |

**No fixed port is needed, and database-backed config does not need enabling.** The allowlist
matches on hostname alone — `normalizeAllowedInternalHost` reduces any entry to its hostname, and
`getValidatedHost` compares only that, so the port Testcontainers assigns at runtime never enters
it. The host is therefore a static, known value and belongs in the environment like the other two.

Listing both spellings covers whichever `container.getHost()` returns on the runner. **The guard
stays fully enforced**: loopback is named explicitly, nothing is widened, and
`OUTBOUND_HTTP_SAFE_MODE_ENABLED` is left alone — setting it to `false` would disable the
allowlist entirely and must not be used.

### 3. Docker must be usable by Testcontainers

The fixture starts a container from inside Jest. No existing Hermes suite does this, so the
`postgres-legacy` stage has never exercised it. `DOCKER_HOST` is not in the runner's allowlist;
Testcontainers falls back to `/var/run/docker.sock`, which normally exists on `ubuntu-latest`,
but this is **unverified on the Hermes runner path**.

### 4. Preconditions the suite asserts itself

Copied from the existing `hermes-*` suites, so it refuses to run anywhere but disposable CI:
`GITHUB_ACTIONS=true`, and `PG_DATABASE_URL` exactly `postgres://…@127.0.0.1:5432/p0_ci`.
It needs no `X-Expected-Workspace-Id` and runs with same-origin multiworkspace off; companies A
and B are addressed by minting two tokens for one user, the way `hermes-prospection` does.

## Why a dedicated fixture rather than the existing GreenMail util

`start-greenmail-container.util.ts` exposes GreenMail's **plaintext** ports, and every existing
container suite registers its account with `EmailConnectionSecurity.NONE`. That cannot work here,
because registering the central `MAIL` connection goes through
`HermesConnectionsService.mailbox()`, which requires `SSL_TLS` or `STARTTLS` on **both** IMAP and
SMTP before it will accept the account:

```ts
const secure = (security: unknown) =>
  security === EmailConnectionSecurity.SSL_TLS ||
  security === EmailConnectionSecurity.STARTTLS;
… throw new BadRequestException('MAIL_ACCOUNT_UNAVAILABLE');
```

So the new fixture exposes GreenMail's **TLS** ports (`imaps 3993`, `smtps 3465`) and the account
is saved with `SSL_TLS` on both protocols. **The guard is satisfied, not relaxed** — the account
genuinely uses TLS. The only accommodation is the product's existing
`IMAP_SMTP_ALLOW_SELF_SIGNED` switch for the fixture's self-signed certificate.

## What the journey does

Over real HTTP against a real PostgreSQL, in order: save the operator mailbox as a native
`connectedAccount` over TLS → register it as the central `MAIL` connection via
`hermesSaveConnectionV4` → create the sending domain via `createEmailingDomain` → build people, a
list and its members and the campaign through the generic record API → re-read content and sender
from storage → per-recipient preview → explicitly addressed test send → schedule → cancel →
immediate send → read the captured bytes back out of the isolated server over IMAP.

Negative paths asserted: a preview for a person outside the campaign's list is refused; a sender
that merely shares the verified domain is refused; company B cannot preview, send or read company
A's campaign, and A's fixture prefix never appears in any refusal; a durably opposed address
leaves the audience; and a delivery quarantined as `SEND_OUTCOME_UNCONFIRMED` is not resent.

### Two deliberate design points

- **The domain is verified by the real routine, not seeded.** `createEmailingDomain` runs
  `SmtpEmailingDomainDriver.verifyDomain`, which connects to the fixture, and
  `UnsubscribeHostnameService.sync`, which falls back to `useServerHostname` because no DNS
  manager is configured. The suite asserts `VERIFIED` and `ACTIVE` as **outputs of those
  routines**. This is what finally tests, rather than asserts from a source reading, that a
  provider-managed mailbox can send without controlling the domain's DNS.
- **The content is a genuine native `EmailDocument`** built with `buildEmailDocument` and stamped
  with `EMAIL_DOCUMENT_SCHEMA_VERSION`, carrying a real `{{fullName}}` variable so substitution is
  observable per recipient. The stamp is applied in the suite on purpose: the generic record API
  does **not** stamp it, and `parseCanonicalEmailDocument` rejects a versionless document — a real
  rough edge of the persistence path CJ-01 uses.

### The uncertain-outcome step, and what it substitutes

To reach the quarantine, the suite **updates the `campaignDelivery` row in PostgreSQL** to
`failureReason = 'SEND_OUTCOME_UNCONFIRMED'`, then re-sends and asserts no additional message was
captured and the row stayed quarantined. That edits fixture **state**; it mocks no code, and the
engine's own `buildNonQuarantinedCampaignDeliveryCriteria` is what must refuse the claim. A
genuinely lost SMTP acknowledgement cannot be induced from GreenMail; that half is covered by the
service-level spec, which drops the receipt on a loopback socket.

## Substitution rule — what is real here

No mock of any campaign business service, of any guard, or of the persistence. The only
substituted thing is the **mail server itself**, replaced by the isolated fixture so the journey
has somewhere to land. Everything between the HTTP boundary and the socket is real: resolvers,
guards, feature flags, role scoping, the campaign services, the queue, the SMTP driver and
PostgreSQL.

## Execution status — stated plainly

**This suite has never been run.** I wrote it; I did not execute it, and I am not reporting it as
passing.

Local execution is impossible and was never in scope for this lot: PostgreSQL (5432), Redis
(6379) and Docker are all unavailable in this environment, my brief assigns the PostgreSQL stages
to cloud CI, and the suite's own preamble refuses to run outside disposable CI. The integration
Jest config additionally OOMs locally without the runner's `--max-old-space-size=6144`.

What I did verify locally, and the full honest extent of it:

- both files parse as TypeScript under `@swc/core`, the same transformer Jest uses;
- every `src/…` and `test/…` import path resolves to a real file;
- `imapflow`, `testcontainers` and `supertest` resolve, and the named exports used
  (`buildEmailDocument`, `expectEventually`, `updateConfigVariable`,
  `EMAIL_DOCUMENT_SCHEMA_VERSION`, `MessageCampaignStatus`,
  `FeatureFlagKey.IS_MESSAGE_CAMPAIGN_ENABLED`) exist;
- the filename satisfies the integration-suite validator regex.

**Unproven until CI runs it**, and therefore the list of things most likely to need a fix on the
first red run: whether GreenMail's TLS ports come up under `-Dgreenmail.setup.test.imaps/smtps`
and whether the account save's immediate IMAP authentication accepts the self-signed certificate;
whether the generic record API accepts the exact `createMessageCampaign` / `createMessageList` /
`createMessageListMember` argument shapes used; the workspace schema name used by the raw SQL step; and whether job draining
settles the immediate send within the polling window. Each is an ordinary first-run fix, but none
of them is currently evidence of anything.

I would rather hand over a suite that is honest about being unexecuted than one described as
proving a journey it has not yet run.

## Why the static environment value, and not database-backed config

Root offered two ways out of the first red run and asked for a judgement. The static environment
value is the right one, and the reason root leaned the other way does not hold.

The concern was that Testcontainers assigns the port at runtime, so the host could not be known
before the process starts. **The allowlist never sees the port.**
`normalizeAllowedInternalHost` reduces every entry to a hostname, and `getValidatedHost` compares
hostnames only. The value is `localhost,127.0.0.1` whatever port the container lands on, so it is
static and can be set before boot.

Turning on `IS_CONFIG_VARIABLES_IN_DB_ENABLED` for this stage would also work, but it is the
larger and riskier change:

- it alters how **every** config variable resolves in that stage, including the two this journey
  depends on (`EMAILING_DOMAIN_DRIVER=SMTP`, `IMAP_SMTP_ALLOW_SELF_SIGNED=true`). A database value
  shadowing either of those would make the suite prove something other than what it claims;
- it moves this stage's config semantics away from the four proven suites, so a failure here
  would no longer be comparable with theirs;
- it buys nothing, because the value it would let us write at runtime is a constant.

One static variable, asserted by the suite, keeps the guard enforced and the stage comparable.
