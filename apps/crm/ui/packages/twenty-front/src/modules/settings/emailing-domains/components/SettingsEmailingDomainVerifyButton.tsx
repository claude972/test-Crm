import { useMutation } from '@apollo/client/react';
import { useLingui } from '@lingui/react/macro';
import { IconRefresh } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { VerifyEmailingDomainDocument } from '~/generated-metadata/graphql';

import { getToastOptionsFromError } from '@/error-handler/utils/getToastOptionsFromError';
import { useToast } from 'kovaa-lab-ui/components/feedback';

type SettingsEmailingDomainVerifyButtonProps = {
  emailingDomainId: string;
};

export const SettingsEmailingDomainVerifyButton = ({
  emailingDomainId,
}: SettingsEmailingDomainVerifyButtonProps) => {
  const { t } = useLingui();
  const { enqueueToast } = useToast();
  const [verifyEmailingDomain, { loading }] = useMutation(
    VerifyEmailingDomainDocument,
  );

  const handleVerify = async () => {
    try {
      await verifyEmailingDomain({ variables: { id: emailingDomainId } });
      enqueueToast({
        status: 'success',
        children: t`Started verification process`,
      });
    } catch (error) {
      enqueueToast(getToastOptionsFromError({ error }));
    }
  };

  return (
    <Button
      onClick={handleVerify}
      loading={loading}
      startIcon={<IconRefresh />}
      disabled={loading}
      variant="outline"
    >{t`Check verification`}</Button>
  );
};
