import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { Checkbox } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesImportRowStatusTag } from '@/prospection/components/HermesImportRowStatusTag';
import { type HermesImportRow } from '@/prospection/types/HermesImportBatch';
import { isHermesRowSelectable } from '@/prospection/utils/hermesRowSelection';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';

const HERMES_ROWS_GRID_TEMPLATE_COLUMNS = `${themeCssVariables.table.checkboxColumnWidth} minmax(0, 1.6fr) minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1.4fr)`;

const StyledPrimary = styled.span`
  color: ${themeCssVariables.font.color.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

// A field the staged row did not carry. Said in words, so it never reads as a
// value.
const StyledMissing = styled.span`
  color: ${themeCssVariables.font.color.light};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledError = styled.span`
  color: ${themeCssVariables.font.color.danger};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledSecondary = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

type HermesImportRowsTableProps = {
  rows: HermesImportRow[];
  selectedRowIds: Set<string>;
  onToggleRow: (rowId: string) => void;
};

// A suppressed row is never selectable: the server already decided that its
// address is blocked, and the contract states that no code here removes
// suppressions, so the interface offers no way to act on one. A row whose
// status is outside the contract is not selectable either: an operation on an
// unknown state would be a guess.
export const HermesImportRowsTable = ({
  rows,
  selectedRowIds,
  onToggleRow,
}: HermesImportRowsTableProps) => {
  const { t } = useLingui();

  const getContactName = (row: HermesImportRow): string | null => {
    const name = [row.firstName, row.lastName]
      .filter((part): part is string => isNonEmptyString(part))
      .join(' ');

    return isNonEmptyString(name) ? name : null;
  };

  return (
    <Table>
      <TableRow gridTemplateColumns={HERMES_ROWS_GRID_TEMPLATE_COLUMNS}>
        <TableHeader>{t`Pick`}</TableHeader>
        <TableHeader>{t`Email`}</TableHeader>
        <TableHeader>{t`Company`}</TableHeader>
        <TableHeader>{t`Status`}</TableHeader>
        <TableHeader>{t`Errors`}</TableHeader>
      </TableRow>
      <TableBody>
        {rows.map((row) => {
          const isSelectable = isHermesRowSelectable(row);
          const contactName = getContactName(row);

          return (
            <TableRow
              key={row.id}
              isSelected={selectedRowIds.has(row.id)}
              gridTemplateColumns={HERMES_ROWS_GRID_TEMPLATE_COLUMNS}
            >
              <TableCell>
                <Checkbox
                  aria-label={
                    isSelectable
                      ? t`Select row`
                      : row.status === 'suppressed'
                        ? t`Suppressed: not selectable`
                        : t`Unknown status: not selectable`
                  }
                  checked={selectedRowIds.has(row.id)}
                  disabled={!isSelectable}
                  onCheckedChange={() => onToggleRow(row.id)}
                />
              </TableCell>
              <TableCell overflow="hidden">
                {isNonEmptyString(row.email) ? (
                  <StyledPrimary title={contactName ?? undefined}>
                    {row.email}
                  </StyledPrimary>
                ) : (
                  <StyledMissing>{t`No email`}</StyledMissing>
                )}
              </TableCell>
              <TableCell overflow="hidden">
                {isNonEmptyString(row.companyName) ? (
                  <StyledSecondary>{row.companyName}</StyledSecondary>
                ) : (
                  <StyledMissing>{t`No company`}</StyledMissing>
                )}
              </TableCell>
              <TableCell overflow="hidden">
                <HermesImportRowStatusTag status={row.status} />
              </TableCell>
              <TableCell overflow="hidden">
                {row.errors === null ? (
                  <StyledMissing>{t`Errors unreadable`}</StyledMissing>
                ) : row.errors.length === 0 ? (
                  <StyledMissing>{t`None`}</StyledMissing>
                ) : (
                  <StyledError title={row.errors.join(' · ')}>
                    {row.errors.join(' · ')}
                  </StyledError>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
