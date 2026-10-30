# Reception contract retest — 52e7b6628

The earlier `hermes-frontend-contract-1f60736ed.md` is a **pre-fix historical review**, not a current defect list. This retest reads immutable frontend52e7b6628 (including7c2f4e3aa) against backendcb97f6e7c. Relevant backend service/policy/error-conversion sources are unchanged between those refs. No frontend or production backend file was edited.

## Verified corrections

An isolated adaptation of the existing source-loading contract harness ran the real policy/service with repository doubles, actual client readers/validators and actual backend DTO validation. All four normal payloads parse, false capabilities stay false, legitimate draft replay keeps its IDs, and qualification/draft selections are separated correctly. The corrected draft-name limit, notice credential rejection, explicit information-method choice, blank-email staging and exact2000000-byte constant all pass. The misleading row-conflict description is corrected in source.

No significant tenant-boundary defect was proved. Operations still carry no caller workspace ID, the backend derives scope and rereads authorization, and draft creation revalidates its native audience. Native workspace redirection uses window.open(...,'_self'); no unsupported claim of an in-place cross-workspace state leak is made. This is not an executed authenticated/browser isolation test.

## Two residual functional groups for Claude

1. **DTO boundary alignment remains incomplete (P2).** `validateHermesQualificationInput.ts:192–201` accepts a201-character subject; actual DTO rejects it at200. `validateHermesImportBatchInput.ts:169–206` accepts a41-character phone; actual DTO rejects it at40. The same parser still rejects companyName='' at177–190, while the real DTO accepts the string and policy stores an invalid row. These are executed counterexamples. Complete the previously listed DTO field bounds and preserve present blank company strings for native row validation; do not silently drop rows. A single such field can otherwise refuse the entire import rather than identify it before the call or retain it invalid.

2. **Retention classification tests do not use the real error contract (P2).** The real native converter turns ConflictException('IMPORT_BATCH_LIMIT_REACHED') into message='IMPORT_BATCH_LIMIT_REACHED', extensions.code='CONFLICT', with no subCode. `readHermesCallFailure.ts` checks IMPORT_BATCH_LIMIT_REACHED only as a code, so that actual error remains kind='conflict'; its UI still points at batch ID/content. Current tests simulate a named code that the backend does not emit. Verify the real GraphQL/CombinedGraphQLErrors shape and classify the stable server message token, or coordinate a structured backend subCode. Keep genuine identical retries available at the40-batch limit. Avoid advising removal unless a supported removal flow actually exists.

## Evidence limits

The retest also invoked the actual `convertExceptionToGraphQLError` and the actual client error reader in the isolated source harness. No DB, HTTP/provider service, browser, queue or send ran. No new mirrored frontend tests or duplicate frontend implementation were created. The temporary harness is `/private/tmp/hermes-front-retest.mjs` in this session; the committed10287bd6f harness remains intentionally tied to its original pre-fix counterexamples. Real browser/rendering/error lifecycle and authenticated A/B checks remain the root CI checkpoints.
