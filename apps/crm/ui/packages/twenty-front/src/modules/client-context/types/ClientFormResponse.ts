import { type ConnectorSyncStatus } from '@/connectors/types/ConnectorSyncStatus';
import { type ClientContextProvenance } from '@/client-context/types/ClientContextProvenance';

// One answer inside a received Forms response.
export type ClientFormResponseAnswer = {
  // Stable list key within one response.
  id: string;
  // The question as the form asked it. Null when the payload carried none.
  label: string | null;
  // The answer as submitted. Null when it could not be read; an empty answer
  // is a value the respondent left blank and arrives as an empty string.
  value: string | null;
};

// One Forms response this workspace actually received for a client record.
//
// WHAT THIS SURFACE NEEDS, NOT WHAT THE SERVER PUBLISHES: no contract is
// published for Forms responses. Every field is a requirement, every one of
// them is nullable, and null always means "the payload did not carry a usable
// value" rather than an empty value.
export type ClientFormResponse = {
  id: string;
  // The form the response answered.
  formTitle: string | null;
  // When the respondent submitted it, as the source states. Distinct from
  // provenance.receivedAt.
  submittedAt: string | null;
  // Null when the payload carried no readable answers array. An empty array is
  // a response with no answer; null is a response whose answers are unknown.
  answers: ClientFormResponseAnswer[] | null;
  provenance: ClientContextProvenance;
  // Whether the source confirmed this item or the workspace is still holding
  // it locally. The two never read the same: see ConnectorSyncTag.
  syncStatus: ConnectorSyncStatus;
  // The source's own reason, appended to the status and never replacing it.
  syncReason: string | null;
};
