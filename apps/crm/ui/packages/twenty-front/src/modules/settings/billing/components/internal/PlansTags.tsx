import React from 'react';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { t } from '@lingui/core/macro';
import { BILLING_PLAN_LABELS } from '@/settings/billing/constants/BillingPlanLabels';
import { BILLING_PLAN_TAG_COLORS } from '@/settings/billing/constants/BillingPlanTagColors';
import { type BillingPlanKey } from '~/generated-metadata/graphql';
import { styled } from '@linaria/react';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

type PlansTagsProps = {
  plan: BillingPlanKey;
  isTrialPeriod?: boolean;
};

const StyledTagsWrapper = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

export const PlansTags = ({ plan, isTrialPeriod = false }: PlansTagsProps) => {
  return (
    <StyledTagsWrapper>
      <Tag color={BILLING_PLAN_TAG_COLORS[plan]}>
        {t(BILLING_PLAN_LABELS[plan])}
      </Tag>
      {isTrialPeriod && (
        <Tag color="blue" truncate={false}>
          {t`Trial`}
        </Tag>
      )}
    </StyledTagsWrapper>
  );
};
