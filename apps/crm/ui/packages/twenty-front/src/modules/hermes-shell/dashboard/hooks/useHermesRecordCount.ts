import { type RecordGqlOperationFilter } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

import { HERMES_COUNT_AGGREGATE_FIELDS } from '@/hermes-shell/dashboard/constants/HermesCountAggregateFields';
import { type HermesMetric } from '@/hermes-shell/dashboard/types/HermesMetric';
import { useAggregateRecords } from '@/object-record/hooks/useAggregateRecords';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { AggregateOperations } from '~/generated-metadata/graphql';

type UseHermesRecordCountParams = {
  // The caller must have found this object in the workspace metadata first:
  // the aggregate hook throws on an unknown object name.
  objectMetadataId: string;
  objectNameSingular: string;
  filter?: RecordGqlOperationFilter;
};

export const useHermesRecordCount = ({
  objectMetadataId,
  objectNameSingular,
  filter,
}: UseHermesRecordCountParams): HermesMetric => {
  const objectPermissions = useObjectPermissionsForObject(objectMetadataId);
  const canReadObjectRecords = objectPermissions.canReadObjectRecords;

  const { data, loading, error } = useAggregateRecords({
    objectNameSingular,
    recordGqlFieldsAggregate: HERMES_COUNT_AGGREGATE_FIELDS,
    filter,
    skip: !canReadObjectRecords,
  });

  if (!canReadObjectRecords) {
    return { status: 'unauthorised', value: null };
  }

  if (loading) {
    return { status: 'loading', value: null };
  }

  if (isDefined(error)) {
    return { status: 'unavailable', value: null };
  }

  const rawCount = data?.id?.[AggregateOperations.COUNT];

  // Number('') and Number('   ') are both 0, so passing a blank string through
  // Number would have drawn an empty answer as a real count of zero. It is
  // parsed only when it actually carries something.
  const parsedCount =
    typeof rawCount === 'number'
      ? rawCount
      : typeof rawCount === 'string' && rawCount.trim() !== ''
        ? Number(rawCount)
        : undefined;

  // A count is a non-negative integer. A negative, a fraction, NaN or an
  // infinity is not a count this screen can state, and rendering any of them
  // as zero would invent a fact. Number.isInteger already rejects NaN and
  // Infinity.
  if (
    !isDefined(parsedCount) ||
    !Number.isInteger(parsedCount) ||
    parsedCount < 0
  ) {
    return { status: 'unavailable', value: null };
  }

  return { status: 'available', value: parsedCount };
};
