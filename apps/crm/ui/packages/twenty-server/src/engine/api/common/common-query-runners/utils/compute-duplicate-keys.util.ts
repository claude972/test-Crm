import { type ObjectRecord } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

export const computeDuplicateKeys = ({
  record,
  duplicateKeyColumnGroups,
}: {
  record: ObjectRecord;
  duplicateKeyColumnGroups: string[][];
}): string[] =>
  duplicateKeyColumnGroups
    .map((columns) => ({
      columns,
      values: columns.map((column) => record[column]),
    }))
    .filter(({ values }) => values.every(isDefined))
    .map(({ columns, values }) => JSON.stringify([columns, values]));
