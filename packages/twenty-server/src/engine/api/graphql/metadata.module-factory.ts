import { type YogaDriverConfig } from '@graphql-yoga/nestjs';
import * as Sentry from '@sentry/node';
import GraphQLJSON from 'graphql-type-json';
import { ApiPath } from 'kovaa-lab-shared/types';

import { NodeEnvironment } from 'src/engine/core-modules/kovaa-lab-config/interfaces/node-environment.interface';

import { METADATA_GRAPHQL_OPERATIONS_TO_CACHE } from 'src/engine/api/graphql/graphql-config/constants/metadata-graphql-operations-to-cache.constant';
import { useCachedMetadata } from 'src/engine/api/graphql/graphql-config/hooks/use-cached-metadata';
import { MetadataGraphQLApiModule } from 'src/engine/api/graphql/metadata-graphql-api.module';
import { type CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { ClientConfig } from 'src/engine/core-modules/client-config/client-config.entity';
import { type ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { useSentryTracing } from 'src/engine/core-modules/exception-handler/hooks/use-sentry-tracing';
import { type FeatureFlagService } from 'src/engine/core-modules/feature-flag/services/feature-flag.service';
import { useDisableIntrospectionAndSuggestionsForUnauthenticatedUsers } from 'src/engine/core-modules/graphql/hooks/use-disable-introspection-and-suggestions-for-unauthenticated-users.hook';
import { useGraphQLErrorHandlerHook } from 'src/engine/core-modules/graphql/hooks/use-graphql-error-handler.hook';
import { useValidateGraphqlQueryComplexity } from 'src/engine/core-modules/graphql/hooks/use-validate-graphql-query-complexity.hook';
import { type I18nService } from 'src/engine/core-modules/i18n/i18n.service';
import { type MetricsService } from 'src/engine/core-modules/metrics/metrics.service';
import { type KovaaLab CRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';
import { type DataloaderService } from 'src/engine/dataloaders/dataloader.service';
import { renderApolloPlayground } from 'src/engine/utils/render-apollo-playground.util';
import { type WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { ModulesModule } from 'src/modules/modules.module';

export const metadataModuleFactory = async (
  kovaa-labConfigService: KovaaLab CRMConfigService,
  exceptionHandlerService: ExceptionHandlerService,
  dataloaderService: DataloaderService,
  cacheStorageService: CacheStorageService,
  metricsService: MetricsService,
  i18nService: I18nService,
  _featureFlagService: FeatureFlagService,
  workspaceCacheService: WorkspaceCacheService,
): Promise<YogaDriverConfig> => {
  const config: YogaDriverConfig = {
    autoSchemaFile: true,
    include: [MetadataGraphQLApiModule, ModulesModule],
    resolverSchemaScope: 'metadata',
    buildSchemaOptions: {
      orphanedTypes: [ClientConfig],
    },
    renderGraphiQL() {
      return renderApolloPlayground({ path: ApiPath.Metadata });
    },
    resolvers: { JSON: GraphQLJSON },
    plugins: [
      ...(Sentry.isInitialized() ? [useSentryTracing()] : []),
      useGraphQLErrorHandlerHook({
        metricsService: metricsService,
        exceptionHandlerService,
        i18nService,
        kovaa-labConfigService,
      }),
      useCachedMetadata({
        cacheGetter: cacheStorageService.get.bind(cacheStorageService),
        cacheSetter: cacheStorageService.set.bind(cacheStorageService),
        operationsToCache: METADATA_GRAPHQL_OPERATIONS_TO_CACHE,
        dependencyHashGetter:
          workspaceCacheService.getOrRecomputeCombinedHash.bind(
            workspaceCacheService,
          ),
      }),
      useDisableIntrospectionAndSuggestionsForUnauthenticatedUsers(
        kovaa-labConfigService.get('NODE_ENV') === NodeEnvironment.PRODUCTION,
      ),
      useValidateGraphqlQueryComplexity({
        maximumAllowedFields: kovaa-labConfigService.get('GRAPHQL_MAX_FIELDS'),
        maximumAllowedRootResolvers: 10,
        maximumAllowedNestedFields: 10,
        checkDuplicateRootResolvers: true,
      }),
    ],
    path: `/${ApiPath.Metadata}`,
    context: () => ({
      loaders: dataloaderService.createLoaders(),
    }),
  };

  if (kovaa-labConfigService.get('NODE_ENV') === NodeEnvironment.DEVELOPMENT) {
    config.renderGraphiQL = () => {
      return renderApolloPlayground({ path: ApiPath.Metadata });
    };
  }

  return config;
};
