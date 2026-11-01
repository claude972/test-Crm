# Dedicated WhatsApp provider infrastructure

This is infrastructure for the CRM's native managed connection flow. **A QR or pairing code returned by the diagnostic CLI is not a delivered user flow.** Users must connect from the CRM without API keys, SSH, new DNS or chat instructions once the separately owned backend/UI provisioning is implemented. These files change no application code and do not claim that flow already exists.

The existing CRM9a media contract explicitly accepts Evolution2.3.6 only. Provider and Caddy images are official prebuilt linux/amd64 manifests pinned by digest; no application, Mac or VPS image build is required. Existing Evolution, databases, credentials and Caddy services from other projects are never reused. No real phone association or message operation runs in the smoke.

## Root-owned cloud workflow contract

Ubuntu GitHub-hosted runner with Node24, Docker Compose and OpenSSL, timeout20 minutes. No SSH/provider/account secrets. Checkout the exact integration SHA, then:

```sh
node --test scripts/check-hermes-staging-whatsapp.test.mjs
GITHUB_ACTIONS=true RUNNER_ENVIRONMENT=github-hosted \
HERMES_SOURCE_SHA="$GITHUB_SHA" \
HERMES_STAGING_WA_REPORT_FILE="$RUNNER_TEMP/whatsapp.json" \
  node scripts/check-hermes-staging-whatsapp.mjs
```

It pulls exact images and creates only a random isolated Compose project and fresh volumes. Strict native migration/client generation run before API health. Synthetic unpaired instances exercise private TLS/version/auth isolation, settings and DISABLED webhook configuration. No QR/pairing/connect/send API, real number, CRM account seed or live WhatsApp message is used. Tests check existing ffmpeg produces actual Opus/Ogg bytes; that is not proof of a real WhatsApp vocal. PG/Redis/instance-volume persistence is checked without reconnecting phones. Reports expose only SHA/version/booleans/static phase names. Ordinary errors clean only that random project and private temp files; hard-killed disposable runners are destroyed by GitHub. Passing infrastructure smoke is not proof of a user's connection or receipt/delivery.

## Private preparation, atomic and opt-in

Prepare on the operator's machine; keep the CA private key OFF the VPS. Root creates only the private parent directory, not the final target. Existing targets, symlinks and concurrent preparation locks are refused; no reset or secret regeneration occurs. OpenSSL availability is checked before mutation. Generation uses a private staging directory and atomically renames only after every file is ready. Leaf serial is explicit; ca.srl is not required. Example:

```sh
KOVAALABCRM_WA_ENABLED=true KOVAALABCRM_WA_ID=alpha-20261031 \
KOVAALABCRM_WA_PRIVATE_DIR=/absolute/private/whatsapp-staging/alpha-20261031 \
  node infra/hermes-staging/whatsapp/prepare.mjs
```

Private directory0700, secret files0600. CA public certificate0644 is the sole exception for a narrow read-only application trust mount. Independent random secrets: provider PG, Redis, global operator/provisioner key, instance token, webhook token. No mail or existing-project key is read. The leaf has an exact `.test` SAN and90-day validity; the dedicated root CA is valid one year. This is a durable real-provider session, **not a fake-provider TTL**. Rotation is an explicit operator maintenance action before expiry; no automatic session deletion, key replacement or database reset.

Outputs: plan.json (safe names), credentials.json (all private), operator.json (global/instance/webhook only), provider.env, postgres.env, redis.env, Caddyfile, server.key/server.pem, CA public and private material. Transfer only the files required for each service; **never transfer ca.key to VPS**. Application containers get no provider.env, root key, database credential or operator.json. CA is public, not the instance/webhook/global key.

provisioner.env contains proposed backend contract HERMES_EVOLUTION_PROVISIONER_BASE_URL and HERMES_EVOLUTION_PROVISIONER_API_KEY, both SERVER-ONLY. These names require the backend owner's implementation/ACK; frozen9a does not yet expose managed provisioning from this file. Do not silently load it and claim a working UI. The global key is for provisioning; persisted company connections use their own instance token and independent webhookSecret. Never send the global key to a browser/user or use it in a webhook header.

## Independent deployment shape

Root reviews/executes deployment; this directory performs no SSH or Caddy reload. Set private interpolation paths KOVAALABCRM_WA_PRIVATE_DIR, KOVAALABCRM_WA_SCRIPTS_DIR, KOVAALABCRM_WA_HOST and KOVAALABCRM_WA_TLS_UID/GID. TLS UID/GID must match the VPS owner of the0600 leaf files, not necessarily the Mac UID. Do not dump resolved Compose config or Docker env/inspect to logs. Base project name kovaalabcrm-wa-staging; default dedicated network kovaalabcrm-wa-staging-control.

Four NEW networks:

- data internal: this Evolution/PG/Redis only.
- backend internal: Evolution HTTP8080 + NEW provider-only Caddy.
- control internal: that Caddy + only CRM server/worker added later by root; no PG/Redis or unrelated project.
- egress: Evolution only, required for real WhatsApp/Baileys. Unlike the fictitious mail sink this provider needs outbound WAN.

No host ports. New Caddy listens8443 with the exact privately issued certificate; admin/automatic ACME are off, upstream is fixed wa-api:8080. No production Caddy config changes. Server/worker use the HTTPS .test origin and exact internal hostname exception. Root combines PUBLIC mail+WA CA bytes into a NEW read-only bundle for NODE_EXTRA_CA_CERTS, preserving existing mail CA files and safe mode. No TLS rejection disable, wildcard host exception, or existing secret rotation.

PG16/RedisAOF/instances volumes are dedicated and persistent. Budget about3.4GiB configured plus margin, without a throughput claim. Official Evolution image requires root-owned writable Prisma files for its native db:deploy/db:generate; these are not a new application build. It runs in its own nonprivileged container with ALL capabilities dropped, no-new-privileges, memory/CPU bounds, no Docker socket/host PID, and only its own instance volume. Do not claim a read-only/non-root provider until separately proved compatible with that upstream image. Caddy runs as the leaf owner's non-root UID with bounded tmpfs and read-only root filesystem.

## Native logging and bootstrap boundaries

Upstream deploy_database.sh prints DATABASE_URL; Baileys also logs terminal QR/pairing codes. The wrapper does NOT invoke that shell entrypoint and never inherits native stdout/stderr. It calls the same actual npm db:deploy and db:generate, stops on either failure, then runs the same dist/main. All native streams are drained/discarded before they can reach Docker logs; only a static phase/failed boolean is written to a private /tmp status file. API and dedicated gateway logging drivers are **none**, mandatory. Gateway process output is redirected to /dev/null before Docker logs and Caddy global output is discarded; access logging is not enabled. Pairing-number queries must not enter error/access logs. LOG_LEVEL alone is insufficient because upstream can call console directly. No raw provider errors, URI, SQL, payload, QR or auth headers are published. Health/probes replace blanket docker-log debugging.

## History safety before any association

DATABASE_SAVE_DATA_HISTORIC=false is explicit. New instances set qrcode=false, syncFullHistory=false, readMessages/readStatus/alwaysOnline=false and webhook.enabled=false. These flags alone do not prove no old events: upstream2.3.6 may still emit append/history through MESSAGES_UPSERT. Therefore the CRM webhook MUST remain DISABLED throughout initial association/sync. Even diagnostic configuration writes enabled=false and QR retrieval first rereads that disabled state. Enabling ingress requires a separately reviewed/proved backend new-notify + timestamp/cutoff filter; this package provides no operator flag to bypass that requirement. No historical CRM import is acceptable merely to demonstrate a conversation.

Root must keep company/channel bots OFF before pairing and verify effective policy through UI. Do not configure OpenAI/MCP/Chatwoot/other response integrations to make WhatsApp appear connected. Unconfigured bot/provider states remain honest.

## Operator-only diagnostics, not the CRM delivery

operator.mjs supports create/status/webhook-disabled/qr/pair for private maintenance/testing only. Requires KOVAALABCRM_WA_OPERATOR_CONFIRM=true, refuses GitHub Actions, and communicates only over the pinned private CA/origin. Run it in a short-lived operator helper on the dedicated control network with only plan.json/operator.json/ca.pem read-only plus reviewed code. Never put global keys in command arguments or the CRM browser. Normal user connection must use the separate managed backend/UI implementation.

QR/pair additionally requires KOVAALABCRM_WA_BOTS_OFF_CONFIRMED=true and provider webhook disabled. QR is a bounded PNG dataURL decoded to a new private0600 result path via KOVAALABCRM_WA_RESULT_FILE. Phone for pairing arrives on stdin JSON, not arguments or logs. Pairing code is saved privately; optional explicit operator TTY output only. Nothing prints a number or raw provider response. Existing results are not overwritten. QR/code generation does not establish association or message flow. An iPhone cannot conveniently scan its own displayed QR; user flow should offer QR on another screen and a real supported phone-number pairing option in CRM, without asking for account secrets in chat.

## Receipt, delivery, backup and rotation remain real acceptance work

After user association, exact instance state open is only provider-reported state. Root must test the real connection in CRM, verify new-only ingress activation/filter, then observe a voluntary fresh inbound message. No outgoing test until a recipient is explicitly designated. Human single text/image/video/vocal tests and MIME/Opus/private-media permissions are separate. Provider ACK is not delivered/read. No automatic retries for uncertain sends or bot replies.

Before upgrade, stop only this provider's writers and take recoverable private backups of PG, RedisAOF, instance files, persistent credentials and leaf certificate/config. Keep CA root key separately off VPS. Verify restore in a distinct isolated environment before claiming recoverability. Image rollback alone is not database/session rollback. Certificate rotation must preserve provider session/instance/token and refresh only the public combined CRM trust bundle as necessary. Never prune/reset/down-v on persistent resources or touch Brume/Odoo/Forms/Cal/Evolution services belonging to another project.
