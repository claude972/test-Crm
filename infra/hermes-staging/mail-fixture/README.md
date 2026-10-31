# Isolated fictitious mail — optional acceptance provider

Default OFF. This does not connect a real mailbox or prove external deliverability. Only synthetic operator/ada/grace addresses at one `.test` alias are permitted in acceptance. Application image/source52f remains unchanged. Existing Brume/Odoo/Forms/Cal/Evolution/Caddy, PG/Redis/storage and secrets must remain untouched.

## Cloud workflow contract (root owns workflow)

Ubuntu GitHub-hosted runner, Node24, Docker and OpenSSL; timeout10 minutes. No application build, registry, SSH or GitHub secret is required. Checkout the exact code SHA and run:

```sh
node --test scripts/check-hermes-staging-mail-fixture.test.mjs
GITHUB_ACTIONS=true RUNNER_ENVIRONMENT=github-hosted \
HERMES_SOURCE_SHA="$GITHUB_SHA" \
HERMES_STAGING_MAIL_REPORT_FILE="$RUNNER_TEMP/mail-fixture.json" \
  node scripts/check-hermes-staging-mail-fixture.mjs
```

The smoke pulls pinned Node24 and GreenMail2.1.15 images, generates private random synthetic credentials/certificates, verifies the single internal network/no published ports, TLS negative cases, authenticated SMTPS and IMAPS, standard folders/draft MIME/UID/size, denied WAN, no default provider route, fixed expiry stop of an intentionally SIGSTOP-suspended Java child and cleanup. Reports contain only fixture mode/source SHA/boolean checks/static failing phase. No environment, credentials, auth payloads, raw Docker inspect or MIME is emitted. Private files are removed in finally; forcibly destroyed hosted runners provide the final resource boundary. A protocol green result does not validate any CRM browser journey.

## Operator preparation (root decides execution, no automatic deployment)

Use a new private directory outside Git, parent0700, as an unprivileged dedicated operator. Do not copy CI credentials or spoof runner flags. The preparation refuses an existing target; it never resets mail, replaces secrets or extends expiry silently.

```sh
KOVAALABCRM_MAIL_FIXTURE_ENABLED=true \
KOVAALABCRM_MAIL_FIXTURE_ID=kovaalabcrm-staging-20261031 \
KOVAALABCRM_MAIL_FIXTURE_PRIVATE_DIR=/absolute/private/new-fixture \
  node infra/hermes-staging/mail-fixture/prepare.mjs
```

Expiry defaults to seven days from preparation; KOVAALABCRM_MAIL_FIXTURE_EXPIRES_AT may shorten it. Per-fixture random root material derives independent stable mailbox/keystore secrets with HMAC purpose labels. All private files0600 and directory0700. Only ca.pem is public0644, permitting a file-only read-only mount into app UID1000 without exposing its private parent or CA key. OpenSSL creates a seven-day CA and exact DNS-SAN leaf/PKCS12. Never publish these files, include them in an image/artifact or log resolved Compose configuration.

Prepare operator interpolation variables privately: KOVAALABCRM_MAIL_FIXTURE_PRIVATE_DIR, KOVAALABCRM_MAIL_FIXTURE_HOST (exact hostname in private plan.json), KOVAALABCRM_MAIL_FIXTURE_UID/GID (non-root owner of PKCS12), KOVAALABCRM_MAIL_FIXTURE_SCRIPTS_DIR (absolute reviewed directory containing these code files). No application credentials are in these variables.

Include this Compose overlay only with the existing base file AND explicit `--profile mail-fixture`. Before applying, verify merged configuration privately: provider joins only its new internal mail network, has no host ports/data/edge/other-service networks; only server/worker join it additionally and retain their current data/edge membership. The only additional application mount is public CA read-only; application.env adds NODE_EXTRA_CA_CERTS and one exact hostname allowlist with safe-mode true and self-signed false. If there are already authorized internal-host entries, root must merge that exact list privately rather than overwrite it or use a wildcard. The base runtime env, persistent keys, source image and volumes must remain unchanged. Recreate only server/worker to load CA; no application rebuild.

The provider runs the reviewed provider-init.sh as namespace PID1; this wrapper starts the pinned original /home/greenmail/run_greenmail.sh as a child and waits for it. Java therefore is never namespace PID1. The expiry guard has no network and shares ONLY this provider PID namespace with the same non-root UID. It requires the exact wrapper PID1 cmdline/namespace marker, locates exactly one Java process at PID>1 by executable/jar/environment identity and records its /proc start time. At fixed expiry it revalidates identity and sends TERM to that Java child, then revalidates again and sends KILL after a 10-second grace if still alive. Killing non-init Java causes the waiting wrapper/container to exit, including when Java ignores TERM or is suspended. Already expired configurations stop immediately after startup identity validation. There is no Docker socket, host PID access, privilege, credential exposure or reset operation. Provider restart=no prevents expiry from restarting it. Always start the profile as a whole and verify the guard is running; never start the provider alone. A failed guard is an operational refusal condition. Never execute the guard in another PID namespace. The cloud smoke intentionally SIGSTOPs the real Java child before the deadline; actual hard-stop proof requires that smoke to pass.

The protocol probe is an operations adapter, not a CRM seeder. It initializes provider folders by authenticated IMAP and uses fictitious SMTP only. It must run with access to only plan.json/credentials.json/ca.pem, this reviewed code directory, and the dedicated mail network. The existing scripts/preview-mail-fixture-* remain runner-only and unchanged; do not run them on VPS or relax their guards.

## Actual browser acceptance is still required

Root creates the native operator mail account, domain verification and company MAIL link through UI. Use hostname from plan.json, IMAPS3993 and SMTPS3465, SSL_TLS, handle operator@hostname, login operator and private operator credential. No direct DB or API seed is provided. Use a dedicated fictitious company and Ada/Grace recipients only. Keep UI/final report explicit that this is an isolated fake provider.

R08: actual incoming sync/refresh, folders, safe HTML and synthetic attachment/image, compose/reply/all/forward, draft reopen/reload, Sent without duplicate emission and trash. R10: persistent content/sender/audience, personalized preview without emission/tracking, explicit test, human send, schedule/cancel and opposition/tracking with synthetic messages only. Compare actual captures and UI lifecycle; SMTP250 is not real deliverability. If folder recognition or refresh fails, record the product failure rather than seed around it.

GreenMail messages are ephemeral; no unverified persistence setting is claimed. Back up fixture configuration/CA/credentials privately and preserve synthetic evidence as needed. Provider restart/reset can change UIDVALIDITY or lose messages. Cancel synthetic schedules, unlink only fictitious accounts through UI and preserve evidence before intentional reset. Use a new fixture ID for a fresh dataset; never erase CRM or other services. Expiry stops, it does not rotate credentials or reset data.

To disable, root cancels synthetic queued work and removes synthetic links through UI, restores original server/worker env/mounts and removes only this exact host allowlist entry, then stops/removes only uniquely identified fixture/guard/network resources. Never prune, down-v or delete unrelated volumes. Real providers, PWA/Safari and full CRM acceptance remain separate proof.
