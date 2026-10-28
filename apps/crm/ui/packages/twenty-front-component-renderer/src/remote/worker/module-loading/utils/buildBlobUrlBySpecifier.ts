import { type SdkClientUrls } from '@/types/SdkClientUrls';
import { FRONT_COMPONENT_SHARED_DEPENDENCIES_IMPORT_SPECIFIER } from 'kovaa-lab-shared/application';
import { isDefined } from 'kovaa-lab-shared/utils';

export const buildBlobUrlBySpecifier = ({
  sdkModuleBlobUrls,
  sharedDependenciesModuleBlobUrl,
}: {
  sdkModuleBlobUrls: SdkClientUrls | null;
  sharedDependenciesModuleBlobUrl: string | null;
}): Record<string, string> => ({
  ...(isDefined(sdkModuleBlobUrls)
    ? {
        'kovaa-lab-client-sdk/core': sdkModuleBlobUrls.core,
        'kovaa-lab-client-sdk/metadata': sdkModuleBlobUrls.metadata,
      }
    : {}),
  ...(isDefined(sharedDependenciesModuleBlobUrl)
    ? {
        [FRONT_COMPONENT_SHARED_DEPENDENCIES_IMPORT_SPECIFIER]:
          sharedDependenciesModuleBlobUrl,
      }
    : {}),
});
