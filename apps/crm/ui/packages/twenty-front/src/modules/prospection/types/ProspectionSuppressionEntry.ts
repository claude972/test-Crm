import { type MessageSuppressionReason } from '~/generated-metadata/graphql';

// One entry of the workspace suppression register, as the metadata returns it.
// No verdict is derived here: reason and unsubscribeTopicId are what the
// server itself combines to decide whether a send is blocked, and only the
// server makes that decision.
//
// unsubscribeTopicId null is the register's own way of saying "every topic";
// an identifier limits the entry to that topic.
export type ProspectionSuppressionEntry = {
  id: string;
  reason: MessageSuppressionReason;
  unsubscribeTopicId: string | null;
  createdAt: string | null;
};

// How much of the register this session could read. With anything other than
// 'complete', an address absent from the register is unknown — not clear.
export type ProspectionRegisterCoverage =
  | 'complete'
  | 'partial'
  | 'unavailable';
