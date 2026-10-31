# Isolated fixture standard folders — 2026-10-31

Base `601143e27e85f28ac85de9bb5fbe61bb52a3a566`, implementation `328ce22888aae2b639ee0d9d2e50bbffb251ac8a`. Coordination claim `2a039ffbe` preceded editing.

## Scope

Only the disposable opt-in mail fixture, its protocol smoke and tests changed. No application source, permission/identity guard, CRM account/link/domain, real mailbox, runtime P0 or Vercel deployment was modified or launched.

The fixture previously exposed INBOX only. Native draft save requires a recognized Drafts mailbox, and sent-copy persistence requires Sent. GreenMail2.1.15 supports authenticated CREATE but does not advertise SPECIAL-USE; the existing installed ImapFlow identifies exact Drafts/Sent/Trash names through its native fallback. No application folder hint or permission fallback was added.

After TLS readiness and before reporting fixture ready, the provisioner now authenticates privately over TLS to fixed loopback port3993 with verified CA/SAN and creates exactly Drafts, Sent and Trash for exactly operator, ada and grace. Validation refuses foreign hostname/domain, another account list, wrong mode, malformed password or expired plan before a socket is opened. Startup failures retain existing cleanup and sanitized diagnostics. Internal Docker network, TLS verification, bounded expiry, private files and cleanup are unchanged.

## Actual proof

[CI41232322698](https://github.com/claude972/test-Crm/actions/runs/41232322698), exact implementation SHA328ce22888aae2b639ee0d9d2e50bbffb251ac8a, **SUCCESS** at19:03UTC:

- Twelve boundary/TLS/cleanup tests passed, including invalid folder-provisioning plans rejected before network access.
- Provisioning completed authenticated CREATE of three folders in each of the three synthetic mailboxes.
- Actual SMTPS synthetic deposit and IMAPS read passed with CA/SAN verification. INBOX UID1 reported445bytes, complete MIME445bytes, bounded partial445bytes; strict size guard condition true.
- Each mailbox LIST contained all three folders. Each accepted an APPEND into Drafts with the Draft flag; subsequent SELECT/FETCH verified UIDVALIDITY, UID1, flag, exact synthetic MIME content and equal RFC822.SIZE/literal/input byte lengths.
- Cleanup verification passed: no Docker container/network, loopback forwarders, host mapping or private files remained.
- Syntax checks, whitespace check and redacted Gitleaks scan passed. No MIME, credentials or provider response bodies were added to logs.

## Limits

This is an isolated provider protocol proof, not a native UI draft/reload/sent-copy acceptance result. Existing live601 remains unchanged and will still lack these folders until the owner provisions/recreates its fixture through an authorized path. No real-provider delivery or production mailbox capability is claimed. No CRM seed or automatic sending is performed by startup folder provisioning; APPEND synthetic drafts occurs only in the dedicated protocol smoke.
