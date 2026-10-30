import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { ProspectionCountValue } from '@/prospection/components/ProspectionCountValue';
import { getProspectionCampaignAudiencePath } from '@/prospection/constants/ProspectionRoutePaths';
import { type CampaignAudienceRow } from '@/prospection/hooks/useCampaignAudiences';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';

// The contacts column is the widest: a partial figure carries its
// denominator, and a Tag that is not truncated keeps its full width.
const CAMPAIGN_AUDIENCES_GRID_TEMPLATE_COLUMNS =
  'minmax(0, 2fr) minmax(0, 1.6fr) minmax(0, 1fr)';

const StyledName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

type CampaignAudiencesTableProps = {
  rows: CampaignAudienceRow[];
};

export const CampaignAudiencesTable = ({ rows }: CampaignAudiencesTableProps) => {
  const { t, i18n } = useLingui();

  return (
    <Table>
      <TableRow gridTemplateColumns={CAMPAIGN_AUDIENCES_GRID_TEMPLATE_COLUMNS}>
        <TableHeader>{t`Audience`}</TableHeader>
        <TableHeader>{t`Contacts`}</TableHeader>
        <TableHeader>{t`Created`}</TableHeader>
      </TableRow>
      <TableBody>
        {rows.map(({ list, contactCount }) => {
          const trimmedName = list.name?.trim();

          return (
            <TableRow
              key={list.id}
              to={getProspectionCampaignAudiencePath(list.id)}
              gridTemplateColumns={CAMPAIGN_AUDIENCES_GRID_TEMPLATE_COLUMNS}
            >
              <TableCell overflow="hidden">
                <StyledName>
                  {isNonEmptyString(trimmedName)
                    ? trimmedName
                    : t`Untitled audience`}
                </StyledName>
              </TableCell>
              <TableCell overflow="hidden">
                <ProspectionCountValue count={contactCount} />
              </TableCell>
              <TableCell overflow="hidden">
                {isDefined(list.createdAt)
                  ? i18n.date(new Date(list.createdAt), {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : t`Unknown`}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
