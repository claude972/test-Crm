import { MetadataApiClient } from 'kovaa-lab-client-sdk/metadata';
import { type JobStatusResult } from 'kovaa-lab-shared/application';

export const getJobs = async (jobIds: string[]): Promise<JobStatusResult[]> => {
  const client = new MetadataApiClient();

  const { getJobs: result } = await client.query({
    getJobs: {
      __args: { jobIds },
      jobId: true,
      state: true,
      attemptsMade: true,
      failedReason: true,
      enqueuedAt: true,
      startedAt: true,
      finishedAt: true,
    },
  });

  return result;
};
