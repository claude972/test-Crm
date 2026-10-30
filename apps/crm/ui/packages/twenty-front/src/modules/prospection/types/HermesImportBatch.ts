import { type HermesImportRowStatus } from '@/prospection/types/HermesImportRowStatus';

// The four operations return GraphQLJSONObject, so every field below is the
// result of a defensive read, not of a generated type. Null always means "the
// payload did not carry a usable value", never an empty value.
export type HermesImportRow = {
  id: string;
  // Null when the payload's status is not one of the six contract statuses.
  status: HermesImportRowStatus | null;
  // The unusable status as received, kept only to report it as unknown.
  unknownStatus: string | null;
  // Null when the payload carried no readable errors array. An empty array is
  // a row with no error; null is a row whose errors could not be read.
  errors: string[] | null;
  email: string | null;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  website: string | null;
  phone: string | null;
  personId: string | null;
  companyId: string | null;
  // The contract states that a qualification records purpose, notice URL,
  // information method, timestamp and actor, without naming those fields. Only
  // its presence is read here; inventing field names would be guessing.
  hasQualification: boolean;
};

export type HermesImportBatch = {
  id: string;
  externalBatchId: string | null;
  fingerprint: string | null;
  name: string | null;
  sourceUrl: string | null;
  collectedAt: string | null;
  createdAt: string | null;
  createdByUserId: string | null;
  rows: HermesImportRow[];
  // False when the payload carried no readable rows array: the batch then has
  // an unknown number of rows, not zero.
  areRowsReadable: boolean;
  // Rows present in the payload that carried no usable id. They are counted so
  // they can be reported instead of silently disappearing.
  unreadableRowCount: number;
};
