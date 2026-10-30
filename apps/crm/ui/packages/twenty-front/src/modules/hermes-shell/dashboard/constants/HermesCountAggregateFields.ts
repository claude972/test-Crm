import { type RecordGqlFieldsAggregate } from '@/object-record/graphql/types/RecordGqlFieldsAggregate';
import { AggregateOperations } from '~/generated-metadata/graphql';

// Module-level so the generated aggregate query keeps the same identity across
// renders. Counts only: no amount and no currency is summed anywhere on this
// dashboard, which keeps it out of reach of any rounding or rate question.
export const HERMES_COUNT_AGGREGATE_FIELDS: RecordGqlFieldsAggregate = {
  id: [AggregateOperations.COUNT],
};
