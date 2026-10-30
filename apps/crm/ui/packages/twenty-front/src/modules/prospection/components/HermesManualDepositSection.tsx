import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesImportBatchForm } from '@/prospection/components/HermesImportBatchForm';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';

// A native <details>, so the second path is folded without keyboard work of
// its own: a summary is focusable, operable with Enter and Space, and its
// open state is exposed to assistive technology by the element itself.
const StyledDetails = styled.details`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledSummary = styled.summary`
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  width: fit-content;

  &:focus-visible {
    outline: 1px solid ${themeCssVariables.border.color.strong};
    outline-offset: ${themeCssVariables.spacing[0.5]};
  }
`;

const StyledBody = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  padding-top: ${themeCssVariables.spacing[3]};
`;

type HermesManualDepositSectionProps = {
  // Collections already retained in this workspace, to say when the retention
  // bound is reached. Null when that figure could not be read.
  retainedBatchCount: number | null;
  onStaged: () => void;
};

// The manual JSON deposit, kept but demoted. It stays reachable because it is
// the only way to bring in a collection the entry point did not carry, and it
// is folded because it is no longer how collections normally arrive.
export const HermesManualDepositSection = ({
  retainedBatchCount,
  onStaged,
}: HermesManualDepositSectionProps) => {
  const { t } = useLingui();

  return (
    <StyledDetails>
      <StyledSummary>{t`Manual JSON deposit — second choice`}</StyledSummary>
      <StyledBody>
        <ProspectionNote>
          <Trans>
            For a collection the entry point did not bring in. What is staged
            here is reviewed exactly like an automatic collection.
          </Trans>
        </ProspectionNote>
        <HermesImportBatchForm
          retainedBatchCount={retainedBatchCount}
          onStaged={onStaged}
        />
      </StyledBody>
    </StyledDetails>
  );
};
