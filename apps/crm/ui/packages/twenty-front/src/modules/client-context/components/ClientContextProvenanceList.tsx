import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { ClientContextInstant } from '@/client-context/components/ClientContextInstant';
import { type ClientContextProvenance } from '@/client-context/types/ClientContextProvenance';
import { readClientContextSourceName } from '@/client-context/utils/readClientContextSourceName';

const StyledRows = styled.dl`
  display: grid;
  gap: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[3]};
  grid-template-columns: max-content minmax(0, 1fr);
  margin: 0;

  dt {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
  }

  dd {
    color: ${themeCssVariables.font.color.secondary};
    font-size: ${themeCssVariables.font.size.sm};
    margin: 0;
    overflow-wrap: anywhere;
  }
`;

const StyledMissing = styled.span`
  color: ${themeCssVariables.font.color.light};
`;

type ClientContextProvenanceListProps = {
  provenance: ClientContextProvenance;
  // The source this item is being shown under, used only when the payload
  // attributed none. It is shown as the section's source and said to be
  // unattributed, never silently adopted as the item's own.
  fallbackSourceName: string;
};

// Where an item came from, stated on the item itself: a record that shows
// received data has to say which application each piece arrived from and which
// identifier it carries there, or the data cannot be checked against its
// source.
export const ClientContextProvenanceList = ({
  provenance,
  fallbackSourceName,
}: ClientContextProvenanceListProps) => {
  const { t } = useLingui();

  const sourceName = readClientContextSourceName(provenance);

  return (
    <StyledRows>
      <dt>{t`Source`}</dt>
      <dd>
        {isNonEmptyString(sourceName) ? (
          sourceName
        ) : (
          <StyledMissing>{t`${fallbackSourceName}, not attributed`}</StyledMissing>
        )}
      </dd>
      <dt>{t`External id`}</dt>
      <dd>
        {isNonEmptyString(provenance.externalId) ? (
          provenance.externalId
        ) : (
          <StyledMissing>{t`Unknown`}</StyledMissing>
        )}
      </dd>
      {/* When the workspace got it, which is not when it happened. A lagging
          intake shows up here and nowhere else. */}
      <dt>{t`Received`}</dt>
      <dd>
        <ClientContextInstant
          value={provenance.receivedAt}
          absentLabel={t`Not recorded`}
        />
      </dd>
    </StyledRows>
  );
};
