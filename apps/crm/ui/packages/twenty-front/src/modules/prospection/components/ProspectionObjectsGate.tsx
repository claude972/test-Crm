import { Trans } from '@lingui/react/macro';
import { type ReactNode } from 'react';
import { CoreObjectNameSingular } from 'kovaa-lab-shared/types';

import { useDoObjectMetadataItemsExist } from '@/object-metadata/hooks/useDoObjectMetadataItemsExist';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';

type ProspectionObjectsGateProps = {
  children: ReactNode;
};

// The record hooks below throw when an object is absent from the workspace,
// so the objects are checked before anything queries them.
export const ProspectionObjectsGate = ({
  children,
}: ProspectionObjectsGateProps) => {
  const doProspectionObjectsExist = useDoObjectMetadataItemsExist([
    CoreObjectNameSingular.MessageList,
    CoreObjectNameSingular.MessageListMember,
    CoreObjectNameSingular.Company,
  ]);

  if (!doProspectionObjectsExist) {
    return (
      <ProspectionNote>
        <Trans>To set up.</Trans>
      </ProspectionNote>
    );
  }

  return <>{children}</>;
};
