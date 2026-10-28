import { MetadataApiClient } from 'kovaa-lab-client-sdk/metadata';
import {
  type EnqueueJobInput,
  type EnqueueJobResult,
} from 'kovaa-lab-shared/application';

/**
 * @deprecated Use `enqueueJobs` instead.
 */
export const enqueueJob = async (
  input: EnqueueJobInput,
): Promise<EnqueueJobResult> => {
  const client = new MetadataApiClient();

  const { enqueueJob: result } = await client.mutation({
    enqueueJob: {
      __args: { input },
      enqueued: true,
      logicFunctionUniversalIdentifier: true,
      jobId: true,
    },
  });

  return result;
};
