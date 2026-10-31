# V4 campaigns: send from the mailbox the operator registered

## The defect

`EmailingDomainSenderService` asks `EmailingDomainDriverFactory.getCurrentDriver()` for the
current driver at send time. For `EMAILING_DOMAIN_DRIVER=SMTP` the factory built
`SmtpEmailingDomainDriver` from the `EMAILING_SMTP_CONNECTIONS` environment variable alone.

Nothing in that path consulted the connection centre (`core.hermesConnection`, kind `MAIL`).
A mailbox an operator registered there fed the Hermes mail module and nothing else: campaigns
neither left through it nor were restricted to it. Sender checks stopped at the domain —
`EmailingDomainSenderService.assertDomainCanSend` and `SmtpEmailingDomainDriver.assertSender`
both only compared the From address's domain to the verified domain — so any address on a
verified domain could send, registered or not.

## What is wired now

`EmailingDomainMailboxTransportProvider` resolves the registered mailbox and opens it. One
resolution decides three things at once: whether the send may happen, under which exact
address, and through which account the bytes leave.

- It reads the connection centre through the `HERMES_CONNECTIONS_SERVICE` token published by
  the `@Global()` `HermesConnectionsModule`, via a locally declared structural reader type, the
  same way `HermesMailService` does. The centre itself is untouched.
- It opens the transport with the native `SmtpClientProvider`, which
  `MessagingSmtpDriverModule` lists in both `providers` and `exports`, passing only the resolved
  `connectedAccountId`. That provider decrypts the account's SMTP parameters, validates the
  host and builds the transport internally. **No credential is returned to, held by, logged by
  or named in an error of the emailing-domain code.**

`SmtpEmailingDomainDriver` takes that provider as an optional fourth constructor argument.
When it is present, `getTransport` resolves the registered mailbox instead of reading
`EMAILING_SMTP_CONNECTIONS`, which is then **not consulted at all** — not for the transport and
not for the sender allowlist. The send engine itself is unchanged: the unsubscribe content
service, the per-recipient batch loop and its ledger entries, the suppression handling, the
quotas and the `EmailGroupAccessService` licence guard all still run exactly as before. No new
engine and no new driver sits in the send path.

### Resolution rules, all enforced

- **Exact address.** The envelope sender must be the resolved connection's `settings.handle`,
  compared after trimming and lowercasing. Sharing the verified domain carries no authority.
- **Workspace scope.** The resolved connection's `workspaceId` must equal the sending
  workspace's. The centre's own `resolve()` additionally proves the connected account belongs
  to that workspace and that user-workspace, carries that exact handle, has secure IMAP and
  SMTP and no `authFailedAt`, and that the stored credential digest still matches — otherwise
  it raises `MAIL_IDENTITY_CHANGED` or `MAIL_ACCOUNT_CHANGED`.
- **Current revision, including across the open.** Resolution happens at the moment of sending
  and is never captured earlier. `resolve()` re-reads the row and raises
  `CONNECTION_REVISION_CONFLICT` when the connection moved under the send. Opening an account
  is the slow step and therefore its own window, so the **last** authorization happens *after*
  the open and *before* any SMTP use: the connection and account are compared again, and a
  transport that is no longer authorized is closed instead of cached or used.
- **Closed by default.** Absent, disabled, revoked, re-keyed or undecryptable is a refusal,
  never a fallback. Every refusal is an `EmailingDomainDriverException` with code
  `CONFIGURATION_ERROR` and a reason naming the cause.
- **Batch refusals are refusals.** A refused batch recipient is recorded with
  `CONFIGURATION_ERROR`, not `SEND_OUTCOME_UNCONFIRMED`: nothing reached the transport, so the
  ledger must not suggest a message that might have been delivered. A whole batch is refused up
  front in `assertSender`, before any per-recipient entry exists.
- **Rotation invalidates the transport.** Transports are cached by
  `workspaceId|connectionId|revision`. A rotation changes that key, and the workspace's earlier
  transport is closed and evicted before the new account is opened. The cached path re-resolves
  the centre on every call, so a revocation stops the next message.

## What is still NOT wired

**Authorized aliases are not honoured.** The rule is exact-address-or-alias; only the exact
address is enforceable, because the centre publishes no alias list.
`ConnectedAccountEntity.handleAliases` exists but is not part of a resolved connection, so the
provider fails closed on an alias rather than accepting one it cannot verify.

**Non-SMTP drivers are unchanged.** AWS SES, Resend and Log do not read
`EMAILING_SMTP_CONNECTIONS` and are not routed through the registered mailbox.

**A deployment with no connection centre installed at all** keeps the previous
`EMAILING_SMTP_CONNECTIONS` behaviour, because the injected token is `@Optional()` and the
factory only hands the provider to the driver when `isConnectionCentreInstalled` is true.

**`buildConfigKey` still hashes the environment group.** The cached driver identity is keyed on
`EMAILING_SMTP_CONNECTIONS` and `SERVER_URL`. That is harmless, because per-workspace transport
identity is handled by the driver's own cache, but it no longer describes what the SMTP driver
sends through.

**No real delivery is proved here.** The tests assert which account the message is handed to
and which sends refuse; a live send to a real mailbox is a separate, deliberate step.

## Evidence

Command:

```
jest --config <standalone config> --runInBand --runTestsByPath \
  src/engine/core-modules/emailing-domain/drivers/__tests__/emailing-domain-driver.factory.spec.ts \
  src/engine/core-modules/emailing-domain/drivers/smtp/__tests__/smtp-emailing-domain-driver.spec.ts
```

50 tests pass: 19 new, and the 31 pre-existing SMTP driver tests unchanged — including the
mandatory per-recipient unsubscribe headers, the lost-receipt quarantine, the per-recipient
unconfirmed codes and the batch-size guards, which is what shows the send engine was not
disturbed. `--runInBand` is used because the pre-existing driver spec opens real loopback
sockets; under parallel workers that fixture, not this change, leaks a worker handle.

The new tests prove, with the environment relay configured and valid throughout: the message is
handed to the registered `connectedAccountId` and never to the relay; the exact address is used
on both the single and batch paths; the centre is resolved for the sending workspace at send
time; a revision rotation reopens the account and closes the retired transport; a rotation or a
revocation landing **during** the account open refuses the send and closes the stale transport
without sending; and an absent, unreadable, stale-revision, cross-workspace or same-domain-only
sender refuses both `sendEmail` and `sendEmailBatch` without the account ever being opened. No
socket is opened and no provider is contacted: the nodemailer transport is a double.
