import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';

import { type HermesMarketingObjection } from '@/hermes-campaigns-ui/types/HermesMarketingObjection';
import { type ProspectionSuppressionEntry } from '@/prospection/types/ProspectionSuppressionEntry';
import { MessageSuppressionReason } from '~/generated-metadata/graphql';

export type HermesRuntimeUnsubscribeTopic = {
  id: string;
  name?: string | null;
};

type BuildRuntimeMarketingObjectionsArgs = {
  // The suppression register, grouped by address, exactly as the prospection
  // hook hands it over.
  entriesByEmail: Map<string, ProspectionSuppressionEntry[]>;
  topics: HermesRuntimeUnsubscribeTopic[];
};

// The durable marketing objections held in the suppression register.
//
// Only the unsubscribe entries are objections. A bounce and a complaint are
// deliverability facts about an address, and a tracking refusal is a refusal
// of measurement, not of being written to: folding any of them in here would
// present a standing refusal by a person where the server recorded something
// else.
//
// The register publishes an address, a reason, a topic and a moment, and
// nothing else, so the contact's name, how the objection reached the product,
// their commercial stage and their bot mode all stay null. The last two
// matter precisely because the objection moves neither of them, and the screen
// says nothing about them rather than guessing.
export const buildRuntimeMarketingObjections = ({
  entriesByEmail,
  topics,
}: BuildRuntimeMarketingObjectionsArgs): HermesMarketingObjection[] => {
  const topicNameById = new Map(
    topics.map((topic) => [topic.id, topic.name ?? null]),
  );

  return [...entriesByEmail.entries()].flatMap(([address, entries]) =>
    entries
      .filter((entry) => entry.reason === MessageSuppressionReason.UNSUBSCRIBE)
      .map((entry): HermesMarketingObjection => {
        const topicName = isDefined(entry.unsubscribeTopicId)
          ? (topicNameById.get(entry.unsubscribeTopicId)?.trim() ?? '')
          : '';

        return {
          id: entry.id,
          contactLabel: null,
          contactAddress: address,
          scope: isNonEmptyString(topicName) ? topicName : null,
          recordedAt: isNonEmptyString(entry.createdAt)
            ? entry.createdAt
            : null,
          origin: null,
          pipelineStageLabel: null,
          botModeLabel: null,
        };
      }),
  );
};
