import { Trans, useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';

import {
  AppPath,
  type OrderBy,
  type RecordGqlFields,
  type RecordGqlOperationOrderBy,
} from 'kovaa-lab-shared/types';
import { getAppPath, isDefined } from 'kovaa-lab-shared/utils';
import { Section } from 'kovaa-lab-ui/components/layout';
import { OverflowingTextWithTooltip } from 'kovaa-lab-ui/primitives/typography';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesDateValue } from '@/hermes-shell/dashboard/components/HermesDateValue';
import { HermesNote } from '@/hermes-shell/dashboard/components/HermesNote';
import { HermesSelectValueTag } from '@/hermes-shell/dashboard/components/HermesSelectValueTag';
import { HERMES_RECORD_LIST_LIMIT } from '@/hermes-shell/dashboard/constants/HermesRecordListLimit';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { getLabelIdentifierFieldMetadataItem } from '@/object-metadata/utils/getLabelIdentifierFieldMetadataItem';
import { getLabelIdentifierFieldValue } from '@/object-metadata/utils/getLabelIdentifierFieldValue';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
// FieldMetadataType comes from the generated schema because that is the enum
// FieldMetadataItem.type is declared with; the twenty-shared copy is a
// separate enum and would not compare.
import { FieldMetadataType } from '~/generated-metadata/graphql';

const DATE_FIELD_TYPES: FieldMetadataType[] = [
  FieldMetadataType.DATE,
  FieldMetadataType.DATE_TIME,
];

type HermesRecordListSectionProps = {
  title: string;
  // Resolved and permission-checked by the caller: the record hooks throw on
  // an object this workspace does not have.
  objectMetadataItem: EnrichedObjectMetadataItem;
  selectFieldName: string;
  selectColumnLabel: string;
  dateFieldName: string;
  dateColumnLabel: string;
  orderByFieldName: string;
  orderByDirection: OrderBy;
  emptyLabel: string;
};

export const HermesRecordListSection = ({
  title,
  objectMetadataItem,
  selectFieldName,
  selectColumnLabel,
  dateFieldName,
  dateColumnLabel,
  orderByFieldName,
  orderByDirection,
  emptyLabel,
}: HermesRecordListSectionProps) => {
  const { t } = useLingui();

  const labelIdentifierFieldMetadataItem =
    getLabelIdentifierFieldMetadataItem(objectMetadataItem);

  // readableFields throughout: a column is only offered when this role may
  // actually read the field behind it, so no column is ever shown empty
  // because of permissions.
  const selectFieldMetadataItem = objectMetadataItem.readableFields.find(
    (field) =>
      field.name === selectFieldName &&
      field.type === FieldMetadataType.SELECT,
  );

  const dateFieldMetadataItem = objectMetadataItem.readableFields.find(
    (field) =>
      field.name === dateFieldName && DATE_FIELD_TYPES.includes(field.type),
  );

  const isOrderByFieldReadable = objectMetadataItem.readableFields.some(
    (field) => field.name === orderByFieldName,
  );

  // Memoised because the generated document is cached on the identity of
  // these two objects: a fresh object on every render would rebuild the query
  // on every render.
  const recordGqlFields = useMemo<RecordGqlFields>(() => {
    const fields: RecordGqlFields = { id: true };

    if (isDefined(labelIdentifierFieldMetadataItem)) {
      fields[labelIdentifierFieldMetadataItem.name] = true;
    }
    if (isDefined(selectFieldMetadataItem)) {
      fields[selectFieldMetadataItem.name] = true;
    }
    if (isDefined(dateFieldMetadataItem)) {
      fields[dateFieldMetadataItem.name] = true;
    }

    return fields;
  }, [
    labelIdentifierFieldMetadataItem,
    selectFieldMetadataItem,
    dateFieldMetadataItem,
  ]);

  const orderBy = useMemo<RecordGqlOperationOrderBy | undefined>(
    () =>
      isOrderByFieldReadable
        ? [{ [orderByFieldName]: orderByDirection }]
        : undefined,
    [isOrderByFieldReadable, orderByFieldName, orderByDirection],
  );

  const { records, loading, error } = useFindManyRecords({
    objectNameSingular: objectMetadataItem.nameSingular,
    recordGqlFields,
    orderBy,
    limit: HERMES_RECORD_LIST_LIMIT,
  });

  // The status column is sized to its content: its tags do not truncate, so a
  // fixed width would clip a status name instead of widening the column.
  const columnWidths = [
    'minmax(0, 1fr)',
    ...(isDefined(selectFieldMetadataItem) ? ['minmax(0, max-content)'] : []),
    ...(isDefined(dateFieldMetadataItem) ? ['minmax(0, max-content)'] : []),
  ];
  const gridTemplateColumns = columnWidths.join(' ');

  return (
    <Section.Root>
      <Section.Header title={title} />

      {loading && (
        <HermesNote>
          <Trans>Loading…</Trans>
        </HermesNote>
      )}

      {!loading && isDefined(error) && (
        <HermesNote isAlert>
          <Trans>Some data is unavailable.</Trans>
        </HermesNote>
      )}

      {!loading && !isDefined(error) && records.length === 0 && (
        <HermesNote>{emptyLabel}</HermesNote>
      )}

      {!loading && !isDefined(error) && records.length > 0 && (
        <Table>
          <TableRow gridTemplateColumns={gridTemplateColumns}>
            <TableHeader>{objectMetadataItem.labelSingular}</TableHeader>
            {isDefined(selectFieldMetadataItem) && (
              <TableHeader>{selectColumnLabel}</TableHeader>
            )}
            {isDefined(dateFieldMetadataItem) && (
              <TableHeader>{dateColumnLabel}</TableHeader>
            )}
          </TableRow>
          <TableBody>
            {records.map((record) => {
              const label = getLabelIdentifierFieldValue(
                record,
                labelIdentifierFieldMetadataItem,
              );

              return (
                <TableRow
                  key={record.id}
                  gridTemplateColumns={gridTemplateColumns}
                  to={getAppPath(AppPath.RecordShowPage, {
                    objectNameSingular: objectMetadataItem.nameSingular,
                    objectRecordId: record.id,
                  })}
                >
                  <TableCell
                    color={themeCssVariables.font.color.primary}
                    overflow="hidden"
                  >
                    {/* An unnamed record keeps an explicit placeholder rather
                        than an empty cell that reads as a loading row. */}
                    <OverflowingTextWithTooltip
                      text={label === '' ? t`Unnamed` : label}
                    />
                  </TableCell>
                  {isDefined(selectFieldMetadataItem) && (
                    <TableCell>
                      <HermesSelectValueTag
                        fieldMetadataItem={selectFieldMetadataItem}
                        value={record[selectFieldMetadataItem.name]}
                      />
                    </TableCell>
                  )}
                  {isDefined(dateFieldMetadataItem) && (
                    <TableCell>
                      <HermesDateValue
                        value={record[dateFieldMetadataItem.name]}
                      />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Section.Root>
  );
};
