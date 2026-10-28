import { type RecordTableColumnRange } from '@/object-record/record-table/virtualization/types/RecordTableColumnRange';
import { isDefined } from 'kovaa-lab-shared/utils';

export const isRecordTableColumnRendered = ({
  columnIndex,
  renderedColumnRange,
  columnIndexesRenderedOutsideRange,
}: {
  columnIndex: number;
  renderedColumnRange: RecordTableColumnRange | null;
  columnIndexesRenderedOutsideRange: number[];
}) =>
  columnIndex === 0 ||
  columnIndexesRenderedOutsideRange.includes(columnIndex) ||
  (isDefined(renderedColumnRange) &&
    columnIndex >= renderedColumnRange.startColumnIndex &&
    columnIndex <= renderedColumnRange.endColumnIndex);
