import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'kovaa-lab-shared/utils';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { ProspectionOppositionTag } from '@/prospection/components/ProspectionOppositionTag';
import { type ReceivedListMemberQualification } from '@/prospection/types/ReceivedListMemberQualification';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';

const RECEIVED_MEMBERS_GRID_TEMPLATE_COLUMNS =
  'minmax(0, 1.4fr) minmax(0, 1.6fr) minmax(0, 1.2fr) minmax(0, 1fr)';

const StyledPrimary = styled.span`
  color: ${themeCssVariables.font.color.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

// A field the imported row did not carry. Shown in the lighter colour and in
// words, so it never reads as a value.
const StyledMissing = styled.span`
  color: ${themeCssVariables.font.color.light};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

type ReceivedListMembersTableProps = {
  rows: ReceivedListMemberQualification[];
};

export const ReceivedListMembersTable = ({
  rows,
}: ReceivedListMembersTableProps) => {
  const { t } = useLingui();

  return (
    <Table>
      <TableRow gridTemplateColumns={RECEIVED_MEMBERS_GRID_TEMPLATE_COLUMNS}>
        <TableHeader>{t`Contact`}</TableHeader>
        <TableHeader>{t`Email`}</TableHeader>
        <TableHeader>{t`Company`}</TableHeader>
        <TableHeader>{t`Opt-out`}</TableHeader>
      </TableRow>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.memberId}
            gridTemplateColumns={RECEIVED_MEMBERS_GRID_TEMPLATE_COLUMNS}
          >
            <TableCell overflow="hidden">
              {isDefined(row.displayName) ? (
                <StyledPrimary title={row.jobTitle ?? undefined}>
                  {row.displayName}
                </StyledPrimary>
              ) : (
                <StyledMissing>{t`No name`}</StyledMissing>
              )}
            </TableCell>
            <TableCell overflow="hidden">
              {isDefined(row.primaryEmail) ? (
                <StyledPrimary>{row.primaryEmail}</StyledPrimary>
              ) : (
                <StyledMissing>{t`No email`}</StyledMissing>
              )}
            </TableCell>
            <TableCell overflow="hidden">
              {!isDefined(row.companyId) ? (
                <StyledMissing>{t`No company`}</StyledMissing>
              ) : isDefined(row.companyName) ? (
                <StyledPrimary>{row.companyName}</StyledPrimary>
              ) : (
                <StyledMissing>{t`Unknown company`}</StyledMissing>
              )}
            </TableCell>
            <TableCell overflow="hidden">
              <ProspectionOppositionTag state={row.opposition} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
