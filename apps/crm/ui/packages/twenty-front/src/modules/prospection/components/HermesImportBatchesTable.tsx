import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { ProspectionCountValue } from '@/prospection/components/ProspectionCountValue';
import { getProspectionImportBatchPath } from '@/prospection/constants/ProspectionRoutePaths';
import { type HermesImportBatch } from '@/prospection/types/HermesImportBatch';
import { buildHermesBatchCounts } from '@/prospection/utils/buildHermesCounts';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';

const HERMES_BATCHES_GRID_TEMPLATE_COLUMNS =
  'minmax(0, 1.8fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.2fr)';

const StyledName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

// A field the payload did not carry: said in words and in the lighter colour,
// so it never reads as a value.
const StyledMissing = styled.span`
  color: ${themeCssVariables.font.color.light};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

type HermesImportBatchesTableProps = {
  batches: HermesImportBatch[];
};

export const HermesImportBatchesTable = ({
  batches,
}: HermesImportBatchesTableProps) => {
  const { t, i18n } = useLingui();

  return (
    <Table>
      <TableRow gridTemplateColumns={HERMES_BATCHES_GRID_TEMPLATE_COLUMNS}>
        <TableHeader>{t`Batch`}</TableHeader>
        <TableHeader>{t`Rows`}</TableHeader>
        <TableHeader>{t`Qualified`}</TableHeader>
        <TableHeader>{t`Collected`}</TableHeader>
      </TableRow>
      <TableBody>
        {batches.map((batch) => {
          const counts = buildHermesBatchCounts(batch);

          return (
            <TableRow
              key={batch.id}
              to={getProspectionImportBatchPath(batch.id)}
              gridTemplateColumns={HERMES_BATCHES_GRID_TEMPLATE_COLUMNS}
            >
              <TableCell overflow="hidden">
                {isNonEmptyString(batch.name) ? (
                  <StyledName title={batch.externalBatchId ?? undefined}>
                    {batch.name}
                  </StyledName>
                ) : (
                  <StyledMissing>{t`Unnamed batch`}</StyledMissing>
                )}
              </TableCell>
              <TableCell overflow="hidden">
                <ProspectionCountValue count={counts.rows} />
              </TableCell>
              <TableCell overflow="hidden">
                <ProspectionCountValue count={counts.byStatus.qualified} />
              </TableCell>
              <TableCell overflow="hidden">
                {isNonEmptyString(batch.collectedAt) ? (
                  <span>
                    {i18n.date(new Date(batch.collectedAt), {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                ) : (
                  <StyledMissing>{t`Unknown`}</StyledMissing>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
