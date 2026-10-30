import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';
import { IconAlertTriangle, IconSettings } from 'kovaa-lab-ui/icon';
import { Banner, Loader } from 'kovaa-lab-ui/primitives/feedback';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesCampaignNote } from '@/hermes-campaigns-ui/components/HermesCampaignNote';
import { HermesCampaignReason } from '@/hermes-campaigns-ui/components/HermesCampaignReason';
import { type HermesCampaignLoad } from '@/hermes-campaigns-ui/types/HermesCampaignLoad';

const StyledState = styled.div`
  align-items: flex-start;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[4]} ${themeCssVariables.spacing[3]};
`;

const StyledTitle = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledLoading = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]} 0;
`;

type HermesCampaignLoadViewProps<TValue> = {
  load: HermesCampaignLoad<TValue>;
  emptyTitle: string;
  emptyDescription: string;
  notConfiguredTitle: string;
  notConfiguredDescription: string;
  failedTitle: string;
  // Offered only when the caller has something to retry with.
  onRetry?: () => void;
  children: ReactNode;
};

// The five states a section can be in, each rendered as itself.
//
// Nothing collapses: an empty answer is not a failure, a failure is not an
// empty list, and a product that was never configured is neither — it is a
// setup step, and the screen says which one.
export const HermesCampaignLoadView = <TValue,>({
  load,
  emptyTitle,
  emptyDescription,
  notConfiguredTitle,
  notConfiguredDescription,
  failedTitle,
  onRetry,
  children,
}: HermesCampaignLoadViewProps<TValue>) => {
  const { t } = useLingui();

  if (load.kind === 'loading') {
    return (
      // aria-busy and a word, so the wait is announced and not only spun.
      <StyledLoading aria-busy="true" aria-live="polite">
        <Loader />
        <HermesCampaignNote>{t`Reading…`}</HermesCampaignNote>
      </StyledLoading>
    );
  }

  if (load.kind === 'not-configured') {
    return (
      <StyledState>
        <Banner
          status="info"
          variant="soft"
          icon={<IconSettings aria-hidden="true" />}
        >
          {notConfiguredTitle}
        </Banner>
        <HermesCampaignNote>{notConfiguredDescription}</HermesCampaignNote>
        {isNonEmptyString(load.detail?.trim()) && (
          <HermesCampaignNote>{load.detail}</HermesCampaignNote>
        )}
      </StyledState>
    );
  }

  if (load.kind === 'empty') {
    return (
      <StyledState>
        <StyledTitle>{emptyTitle}</StyledTitle>
        <HermesCampaignNote>{emptyDescription}</HermesCampaignNote>
      </StyledState>
    );
  }

  if (load.kind === 'failed') {
    return (
      <StyledState>
        {/* role="alert": a failure that arrives after the first paint still
            has to reach a screen reader. */}
        <Banner
          role="alert"
          status="error"
          variant="soft"
          icon={<IconAlertTriangle aria-hidden="true" />}
          action={
            isDefined(onRetry) ? (
              <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                {t`Read again`}
              </Button>
            ) : undefined
          }
        >
          {failedTitle}
        </Banner>
        <HermesCampaignReason
          reasonCode={load.reasonCode}
          reason={load.reason}
          fallback={t`The server gave no reason. Nothing is assumed from the silence: this section stays unknown.`}
        />
      </StyledState>
    );
  }

  return <>{children}</>;
};
