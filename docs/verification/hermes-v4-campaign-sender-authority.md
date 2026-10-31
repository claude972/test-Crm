# V4 campaigns: the registered mailbox is the sending authority

Scope of this change: `emailing-domain-driver.factory.ts` and its targeted test only.

## The defect

`EmailingDomainSenderService` asks `EmailingDomainDriverFactory.getCurrentDriver()` for the
current driver at send time. For `EMAILING_DOMAIN_DRIVER=SMTP` the factory built
`SmtpEmailingDomainDriver` from the `EMAILING_SMTP_CONNECTIONS` environment variable alone.

Nothing in that path consulted the connection centre (`core.hermesConnection`, kind `MAIL`).
A mailbox an operator registered there fed the Hermes mail module and nothing else: it did not
authorize, restrict or address campaign sending. Sender checks stopped at the domain —
`EmailingDomainSenderService.assertDomainCanSend` and `SmtpEmailingDomainDriver.assertSender`
both only compare the From address's domain to the verified domain — so any address on a
verified domain could send, registered or not.

## What is wired now

The factory injects the connection centre through the `HERMES_CONNECTIONS_SERVICE` token
published by the `@Global()` `HermesConnectionsModule`, using a locally declared structural
reader type, the same way `HermesMailService` does. No module wiring moves.

When that token is present, the SMTP driver is wrapped in
`CentralMailboxAuthorizedSmtpDriver`. Before each `sendEmail` and `sendEmailBatch` handoff it
calls `resolve(workspaceId, 'MAIL')` and requires all of:

- **Exact address.** The envelope sender must be the resolved connection's `settings.handle`,
  compared after trimming and lowercasing. Sharing the verified domain carries no authority.
- **Workspace scope.** The resolved connection's `workspaceId` must equal the sending
  workspace's.
- **Current revision.** Resolution happens at the moment of sending and is never captured
  earlier. `HermesConnectionsService.resolve` re-reads the row and raises
  `CONNECTION_REVISION_CONFLICT` when the connection moved under the send; the gate turns that
  into a refusal.
- **Closed by default.** A connection that is absent, disabled, revoked, re-keyed or
  undecryptable is a refusal, never a fallback. Every refusal is an
  `EmailingDomainDriverException` with code `CONFIGURATION_ERROR` and a reason naming the
  cause.

`EMAILING_SMTP_CONNECTIONS` is no longer sufficient on its own: in each refusal case above the
environment relay is configured and valid for the workspace and sender domain, and the send is
still refused. The targeted test asserts the send engine is never reached in those cases.

## What is explicitly NOT wired

**Campaigns do not yet transmit through the registered mailbox's own SMTP server.** The
registered mailbox now decides _whether_ a campaign may send and _under which exact address_,
but the transport still comes from `EMAILING_SMTP_CONNECTIONS`: host, port, TLS mode and
credentials are the operator's relay, not the mailbox's.

This is a limit of what the connection centre publishes, not an oversight. A resolved `MAIL`
connection carries `{ connectedAccountId, mailbox, handle }` with `secrets: {}` — the policy's
`mail` schema is `.strict()` and `connectionSecretHash` returns `null` for `MAIL`. The SMTP
host, port and password live encrypted on `ConnectedAccountEntity.connectionParameters.SMTP`
and are only decrypted inside the centre's private `mailbox()` helper, which returns a
credential digest and never the credentials. Reaching them from the factory would require
`ConnectedAccountEntity` and `ConnectedAccountTokenEncryptionModule` in
`emailing-domain.module.ts`, which is outside this change's scope.

**Authorized aliases are not honoured.** The rule is exact-address-or-alias; only the exact
address is enforceable, because the centre publishes no alias list.
`ConnectedAccountEntity.handleAliases` exists but is not part of a resolved connection, so the
gate fails closed on an alias rather than accepting one it cannot verify.

**Non-SMTP drivers are unchanged.** AWS SES, Resend and Log do not read
`EMAILING_SMTP_CONNECTIONS` and are not gated.

**A deployment with no connection centre installed at all** keeps the previous
`EMAILING_SMTP_CONNECTIONS` behaviour, because the injected token is `@Optional()`.

## Unchanged by design

The send engine, suppression and opt-out handling, the durable ledger, batch splitting, quotas
and the `EmailGroupAccessService` licence guard. Only the origin of the sending authority
changed; `SmtpEmailingDomainDriver` was not modified and no new engine or abstraction sits in
the send path beyond the gate itself.

## Evidence

`emailing-domain-driver.factory.spec.ts`, 14 assertions, no socket opened and no provider
contacted: the send engine is stubbed at its own boundary. Covered: the gate wraps the driver
when the centre is installed; an authorized connection delegates with its exact address; the
centre is queried for the sending workspace at send time; and absent, unreadable,
stale-revision, cross-workspace and same-domain-only senders each refuse both `sendEmail` and
`sendEmailBatch` without reaching the engine.
