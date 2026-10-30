import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'kovaa-lab-shared/utils';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { ProspectionSuppressionCell } from '@/prospection/components/ProspectionSuppressionCell';
import { type CampaignAudienceMemberRow } from '@/prospection/types/CampaignAudienceMemberRow';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';

const AUDIENCE_MEMBERS_GRID_TEMPLATE_COLUMNS =
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

type CampaignAudienceMembersTableProps = {
  rows: CampaignAudienceMemberRow[];
};

export const CampaignAudienceMembersTable = ({
  rows,
}: CampaignAudienceMembersTableProps) => {
  const { t } = useLingui();

  return (
    <Table>
      <TableRow gridTemplateColumns={AUDIENCE_MEMBERS_GRID_TEMPLATE_COLUMNS}>
        <TableHeader>{t`Contact`}</TableHeader>
        <TableHeader>{t`Email`}</TableHeader>
        <TableHeader>{t`Company`}</TableHeader>
        <TableHeader>{t`Suppression register`}</TableHeader>
      </TableRow>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.memberId}
            gridTemplateColumns={AUDIENCE_MEMBERS_GRID_TEMPLATE_COLUMNS}
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
              <ProspectionSuppressionCell
                entries={row.suppressions}
                isAbsenceKnown={row.isSuppressionAbsenceKnown}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
