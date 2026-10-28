import { t } from '@lingui/core/macro';
import { useEffect } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';
import { useToast } from 'kovaa-lab-ui/components/feedback';

type FrontComponentLoadErrorToastEffectProps = {
  errorMessage?: string;
};

export const FrontComponentLoadErrorToastEffect = ({
  errorMessage,
}: FrontComponentLoadErrorToastEffectProps) => {
  const { enqueueToast } = useToast();

  useEffect(() => {
    if (isDefined(errorMessage)) {
      enqueueToast({
        status: 'error',
        children: t`Failed to load front component: ${errorMessage}`,
      });
    }
  }, [errorMessage, enqueueToast]);

  return null;
};
