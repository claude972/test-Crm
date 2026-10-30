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
  const count =
    typeof rawCount === 'number'
      ? rawCount
      : typeof rawCount === 'string'
        ? Number(rawCount)
        : undefined;

  // A missing or unparseable count is unknown, never zero.
  if (!isDefined(count) || !Number.isFinite(count)) {
    return { status: 'unavailable', value: null };
  }

  return { status: 'available', value: count };
};
