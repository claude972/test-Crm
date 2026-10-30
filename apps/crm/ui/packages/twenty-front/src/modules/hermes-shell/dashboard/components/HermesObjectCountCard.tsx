import { HermesMetricCard } from '@/hermes-shell/dashboard/components/HermesMetricCard';
import { useHermesRecordCount } from '@/hermes-shell/dashboard/hooks/useHermesRecordCount';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';

type HermesObjectCountCardProps = {
  // Resolved by the caller from the workspace metadata, so the count hook is
  // never asked about an object this workspace does not have.
  objectMetadataItem: EnrichedObjectMetadataItem;
};

export const HermesObjectCountCard = ({
  objectMetadataItem,
}: HermesObjectCountCardProps) => {
  const metric = useHermesRecordCount({
    objectMetadataId: objectMetadataItem.id,
    objectNameSingular: objectMetadataItem.nameSingular,
  });

  // The label comes from the workspace's own metadata, so a renamed object
  // reads the way its users renamed it.
  return (
    <HermesMetricCard label={objectMetadataItem.labelPlural} metric={metric} />
  );
};
