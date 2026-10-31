// The mailbox setup entry point the connection centre mounts.
//
// The centre could only SELECT an already existing native account; with none,
// it told the operator to go and connect one elsewhere. This module adds the
// creation half, writing to the SAME native encrypted store as the native
// account page — there is no second store and no second form model here.
export { HermesMailboxSetupPanel } from '@/hermes-mailbox-setup/components/HermesMailboxSetupPanel';
export {
  useHermesMailboxSetup,
  type HermesMailboxSetupOutcome,
  type HermesMailboxMissingProtocol,
  type HermesMailboxProtocolRequirement,
} from '@/hermes-mailbox-setup/hooks/useHermesMailboxSetup';
