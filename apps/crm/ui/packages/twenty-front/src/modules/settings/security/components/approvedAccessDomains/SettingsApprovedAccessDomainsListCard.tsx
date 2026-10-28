import { ToastOnQueryErrorEffect } from '@/apollo/components/ToastOnQueryErrorEffect';
import { useNavigate } from 'react-router-dom';

import { SettingsPath } from 'kovaa-lab-shared/types';

import { SettingsCard } from '@/settings/components/SettingsCard';
import { SettingsListCard } from '@/settings/components/SettingsListCard';
import { useGetAddedRelativeDateDescription } from '@/settings/hooks/useGetAddedRelativeDateDescription';
import { SettingsSecurityApprovedAccessDomainRowDropdownMenu } from '@/settings/security/components/approvedAccessDomains/SettingsSecurityApprovedAccessDomainRowDropdownMenu';
import { SettingsSecurityApprovedAccessDomainValidationEffect } from '@/settings/security/components/approvedAccessDomains/SettingsSecurityApprovedAccessDomainValidationEffect';
import { approvedAccessDomainsState } from '@/settings/security/states/ApprovedAccessDomainsState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useQuery } from '@apollo/client/react';
import { useLingui } from '@lingui/react/macro';
import { useEffect } from 'react';
import { getSettingsPath } from 'kovaa-lab-shared/utils';
import { Status } from 'kovaa-lab-ui/primitives/data-display';
import { IconAt, IconMailCog } from 'kovaa-lab-ui/icon';
import { GetApprovedAccessDomainsDocument } from '~/generated-metadata/graphql';

export const SettingsApprovedAccessDomainsListCard = () => {
  const navigate = useNavigate();
  const { t } = useLingui();
  const { getAddedRelativeDateDescription } =
    useGetAddedRelativeDateDescription();

  const [approvedAccessDomains, setApprovedAccessDomains] = useAtomState(
    approvedAccessDomainsState,
  );

  const {
    loading,
    data: domainsData,
    error: domainsError,
  } = useQuery(GetApprovedAccessDomainsDocument, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (domainsData) {
      setApprovedAccessDomains(domainsData?.getApprovedAccessDomains ?? []);
    }
  }, [domainsData, setApprovedAccessDomains]);

  return (
    <>
      <ToastOnQueryErrorEffect error={domainsError} />
      {loading || !approvedAccessDomains.length ? (
        <SettingsCard
          to={getSettingsPath(SettingsPath.NewApprovedAccessDomain)}
          title={t`Add Approved Access Domain`}
          Icon={<IconMailCog />}
        />
      ) : (
        <>
          <SettingsSecurityApprovedAccessDomainValidationEffect />
          <SettingsListCard
            items={approvedAccessDomains}
            getItemLabel={({ domain }) => domain}
            getItemDescription={({ createdAt }) =>
              getAddedRelativeDateDescription(createdAt)
            }
            RowIcon={IconAt}
            RowRightComponent={({ item: approvedAccessDomain }) => (
              <>
                {!approvedAccessDomain.isValidated && (
                  <Status color="orange">{t`Pending`}</Status>
                )}
                <SettingsSecurityApprovedAccessDomainRowDropdownMenu
                  approvedAccessDomain={approvedAccessDomain}
                />
              </>
            )}
            hasFooter
            footerButtonLabel={t`Add Approved Access Domain`}
            onFooterButtonClick={() =>
              navigate(getSettingsPath(SettingsPath.NewApprovedAccessDomain))
            }
          />
        </>
      )}
    </>
  );
};
