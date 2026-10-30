import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';
import { IconCircleOff } from 'kovaa-lab-ui/icon';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { Section } from 'kovaa-lab-ui/components/layout';
import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesCampaignLoadView } from '@/hermes-campaigns-ui/components/HermesCampaignLoadView';
import { HermesCampaignNote } from '@/hermes-campaigns-ui/components/HermesCampaignNote';
import { type HermesCampaignLoad } from '@/hermes-campaigns-ui/types/HermesCampaignLoad';
import { type HermesMarketingObjection } from '@/hermes-campaigns-ui/types/HermesMarketingObjection';

const StyledList = styled.ul`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  list-style: none;
  margin: 0;
  min-width: 0;
  padding: 0;
`;

const StyledItem = styled.li`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledContact = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  min-width: 0;
  overflow-wrap: anywhere;
`;

const StyledFacts = styled.dl`
  display: grid;
  gap: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[3]};
  grid-template-columns: minmax(8rem, auto) minmax(0, 1fr);
  margin: 0;
  min-width: 0;

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
`;

const StyledTerm = styled.dt`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledDescription = styled.dd`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0 0 ${themeCssVariables.spacing[1]} 0;
  min-width: 0;
  overflow-wrap: anywhere;
`;

type HermesMarketingObjectionSectionProps = {
  load: HermesCampaignLoad<HermesMarketingObjection[]>;
  onRetry?: () => void;
};

// Durable marketing objections: a standing proof carried by a contact, which
// is neither the deal stage nor the bot mode. All three are shown side by
// side to make that visible — an objection excludes the contact from
// emissions and moves neither the stage nor the history.
export const HermesMarketingObjectionSection = ({
  load,
  onRetry,
}: HermesMarketingObjectionSectionProps) => {
  const { t, i18n } = useLingui();

  const objections = load.kind === 'ready' ? load.value : [];

  const formatDate = (value: string | null): string => {
    const trimmed = isDefined(value) ? value.trim() : null;

    if (!isNonEmptyString(trimmed)) {
      return t`Unknown`;
    }

    const date = new Date(trimmed);

    return Number.isNaN(date.getTime())
      ? t`Unknown`
      : i18n.date(date, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <Section.Root>
      <Section.Header
        title={t`Marketing objections`}
        description={t`A durable proof, kept apart from the deal stage and from the bot's mode.`}
      />

      <HermesCampaignLoadView
        load={load}
        emptyTitle={t`No marketing objection`}
        emptyDescription={t`No contact in this workspace has refused prospecting.`}
        notConfiguredTitle={t`Objection register not available`}
        notConfiguredDescription={t`The register is part of the workspace's contact data. It is read, never rebuilt here.`}
        failedTitle={t`The objections could not be read`}
        onRetry={onRetry}
      >
        <StyledList>
          {objections.map((objection) => (
            <StyledItem key={objection.id}>
              <StyledHeader>
                <StyledContact>
                  {isNonEmptyString(objection.contactLabel?.trim())
                    ? objection.contactLabel
                    : isNonEmptyString(objection.contactAddress?.trim())
                      ? objection.contactAddress
                      : t`Contact not published`}
                </StyledContact>
                <Tag
                  color="red"
                  variant="soft"
                  borderStyle="solid"
                  startIcon={<IconCircleOff />}
                  truncate={false}
                >
                  {t`Excluded from emissions`}
                </Tag>
              </StyledHeader>

              <StyledFacts>
                <StyledTerm>{t`Scope`}</StyledTerm>
                <StyledDescription>
                  {isNonEmptyString(objection.scope?.trim())
                    ? objection.scope
                    : t`Not published`}
                </StyledDescription>

                <StyledTerm>{t`Recorded`}</StyledTerm>
                <StyledDescription>
                  {formatDate(objection.recordedAt)}
                </StyledDescription>

                <StyledTerm>{t`Origin`}</StyledTerm>
                <StyledDescription>
                  {isNonEmptyString(objection.origin?.trim())
                    ? objection.origin
                    : t`Not published`}
                </StyledDescription>

                <StyledTerm>{t`Deal stage, unchanged`}</StyledTerm>
                <StyledDescription>
                  {isNonEmptyString(objection.pipelineStageLabel?.trim())
                    ? objection.pipelineStageLabel
                    : t`No deal`}
                </StyledDescription>

                <StyledTerm>{t`Bot mode, unchanged`}</StyledTerm>
                <StyledDescription>
                  {isNonEmptyString(objection.botModeLabel?.trim())
                    ? objection.botModeLabel
                    : t`Not published`}
                </StyledDescription>
              </StyledFacts>
            </StyledItem>
          ))}
        </StyledList>

        <HermesCampaignNote>
          <Trans>
            An objection excludes the contact from emissions. It does not move
            their stage, it does not stop the bot, it does not disconnect a
            channel and it erases no history.
          </Trans>
        </HermesCampaignNote>
      </HermesCampaignLoadView>
    </Section.Root>
  );
};
