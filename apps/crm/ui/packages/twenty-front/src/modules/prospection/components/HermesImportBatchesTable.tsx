import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { parseConnectorCheckedAt } from '@/connectors/utils/parseConnectorCheckedAt';

import { HermesCollectionOriginTag } from '@/prospection/components/HermesCollectionOriginTag';
import { ProspectionCountValue } from '@/prospection/components/ProspectionCountValue';
import { getProspectionImportBatchPath } from '@/prospection/constants/ProspectionRoutePaths';
import { type HermesImportBatch } from '@/prospection/types/HermesImportBatch';
import { buildHermesBatchCounts } from '@/prospection/utils/buildHermesCounts';
import { readHermesCollectionProvenance } from '@/prospection/utils/readHermesCollectionProvenance';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';

// The origin column is the widest after the name: "Origin not published" has
// to fit whole, because its tag carries no truncation and a clipped label
// would read as an origin the server did state.
const HERMES_BATCHES_GRID_TEMPLATE_COLUMNS =
  'minmax(0, 1.4fr) minmax(0, 1.5fr) minmax(0, 0.7fr) minmax(0, 0.8fr) minmax(0, 1.1fr)';

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
        <TableHeader>{t`Collection`}</TableHeader>
        <TableHeader>{t`Origin`}</TableHeader>
        <TableHeader>{t`Rows`}</TableHeader>
        <TableHeader>{t`Qualified`}</TableHeader>
        <TableHeader>{t`Collected`}</TableHeader>
      </TableRow>
      <TableBody>
        {batches.map((batch) => {
          const counts = buildHermesBatchCounts(batch);
          const provenance = readHermesCollectionProvenance(batch);
          // Three cases, not two: a date the payload did not carry and a date
          // that cannot be read are different answers, and formatting an
          // Invalid Date throws a RangeError that would take the whole table
          // down.
          const collectedAt = parseConnectorCheckedAt(provenance.collectedAt);

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
                  <StyledMissing>{t`Unnamed collection`}</StyledMissing>
                )}
              </TableCell>
              {/* Where the collection came from, said before anything is
                  counted: a figure means something different depending on the
                  path it arrived through. */}
              <TableCell overflow="hidden">
                <HermesCollectionOriginTag origin={provenance.origin} />
              </TableCell>
              <TableCell overflow="hidden">
                <ProspectionCountValue count={counts.rows} />
              </TableCell>
              <TableCell overflow="hidden">
                <ProspectionCountValue count={counts.byStatus.qualified} />
              </TableCell>
              <TableCell overflow="hidden">
                {collectedAt.kind === 'at' ? (
                  <span>
                    {i18n.date(collectedAt.date, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                ) : collectedAt.kind === 'unreadable' ? (
                  <StyledMissing>{t`Unreadable`}</StyledMissing>
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
