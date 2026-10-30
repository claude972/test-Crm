import { Trans } from '@lingui/react/macro';

import { type OrderBy } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Section } from 'kovaa-lab-ui/components/layout';

import { HermesNote } from '@/hermes-shell/dashboard/components/HermesNote';
import { HermesRecordListSection } from '@/hermes-shell/dashboard/components/HermesRecordListSection';
import { isMinimalMetadataReadyState } from '@/metadata-store/states/isMinimalMetadataReadyState';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { getObjectPermissionsForObject } from '@/object-metadata/utils/getObjectPermissionsForObject';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

type HermesObjectRecordListSectionProps = {
  title: string;
  objectNameSingular: string;
  selectFieldName: string;
  selectColumnLabel: string;
  dateFieldName: string;
  dateColumnLabel: string;
  orderByFieldName: string;
  orderByDirection: OrderBy;
  emptyLabel: string;
};

// This wrapper exists so the record hooks below are only ever mounted for an
// object this workspace has and this role may read. Both checks happen before
// any query is built, never after one comes back empty.
export const HermesObjectRecordListSection = ({
  title,
  objectNameSingular,
  ...listProps
}: HermesObjectRecordListSectionProps) => {
  const isMinimalMetadataReady = useAtomStateValue(isMinimalMetadataReadyState);
  const { objectMetadataItems } = useObjectMetadataItems();
  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();

  const objectMetadataItem = objectMetadataItems.find(
    (candidate) =>
      candidate.nameSingular === objectNameSingular && candidate.isActive,
  );

  // Before the metadata lands, every object looks absent. Saying "To
  // configure" here would accuse the workspace of a gap it does not have.
  if (!isMinimalMetadataReady) {
    return (
      <Section.Root>
        <Section.Header title={title} />
        <HermesNote>
          <Trans>Loading…</Trans>
        </HermesNote>
      </Section.Root>
    );
  }

  if (!isDefined(objectMetadataItem)) {
    return (
      <Section.Root>
        <Section.Header title={title} />
        <HermesNote>
          <Trans>To configure.</Trans>
        </HermesNote>
      </Section.Root>
    );
  }

  const canReadObjectRecords = getObjectPermissionsForObject(
    objectPermissionsByObjectMetadataId,
    objectMetadataItem.id,
  ).canReadObjectRecords;

  if (!canReadObjectRecords) {
    return (
      <Section.Root>
        <Section.Header title={title} />
        <HermesNote>
          <Trans>Not authorised.</Trans>
        </HermesNote>
      </Section.Root>
    );
  }

  return (
    <HermesRecordListSection
      title={title}
      objectMetadataItem={objectMetadataItem}
      // oxlint-disable-next-line react/jsx-props-no-spreading
      {...listProps}
    />
  );
};
