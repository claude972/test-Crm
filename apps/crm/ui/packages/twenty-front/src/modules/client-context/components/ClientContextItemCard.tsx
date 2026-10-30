import { styled } from '@linaria/react';
import { type ReactNode } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { type IconComponent } from 'kovaa-lab-ui/icon';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { ClientContextProvenanceList } from '@/client-context/components/ClientContextProvenanceList';
import { type ClientContextProvenance } from '@/client-context/types/ClientContextProvenance';
import { ConnectorSyncTag } from '@/connectors/components/ConnectorSyncTag';
import { type ConnectorSyncStatus } from '@/connectors/types/ConnectorSyncStatus';

const StyledCard = styled.article`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledHeader = styled.div`
  align-items: start;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledIdentity = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledIcon = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-shrink: 0;

  & > svg {
    block-size: calc(${themeCssVariables.icon.size.md} * 1px);
    inline-size: calc(${themeCssVariables.icon.size.md} * 1px);
    stroke-width: ${themeCssVariables.icon.stroke.md};
  }
`;

const StyledTitle = styled.h4`
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
`;

// A title the source did not give. Lighter and lighter-weight, so it never
// reads as the item's own name.
const StyledMissingTitle = styled(StyledTitle)`
  color: ${themeCssVariables.font.color.light};
  font-weight: ${themeCssVariables.font.weight.regular};
`;

type ClientContextItemCardProps = {
  Icon: IconComponent;
  title: string | null;
  untitledLabel: string;
  syncStatus: ConnectorSyncStatus;
  syncReason: string | null;
  provenance: ClientContextProvenance;
  fallbackSourceName: string;
  children?: ReactNode;
};

// The single shell every received item is shown in, so a Forms response and an
// appointment cannot acquire different degrees of honesty.
//
// The sync state sits beside the title because it changes what the item means:
// an item this workspace is still holding locally is not a confirmation from
// its source, and the two must never read alike.
export const ClientContextItemCard = ({
  Icon,
  title,
  untitledLabel,
  syncStatus,
  syncReason,
  provenance,
  fallbackSourceName,
  children,
}: ClientContextItemCardProps) => (
  <StyledCard>
    <StyledHeader>
      <StyledIdentity>
        <StyledIcon aria-hidden>
          <Icon />
        </StyledIcon>
        {isNonEmptyString(title) ? (
          <StyledTitle>{title}</StyledTitle>
        ) : (
          <StyledMissingTitle>{untitledLabel}</StyledMissingTitle>
        )}
      </StyledIdentity>
      <ConnectorSyncTag status={syncStatus} reason={syncReason ?? undefined} />
    </StyledHeader>

    {children}

    <ClientContextProvenanceList
      provenance={provenance}
      fallbackSourceName={fallbackSourceName}
    />
  </StyledCard>
);
