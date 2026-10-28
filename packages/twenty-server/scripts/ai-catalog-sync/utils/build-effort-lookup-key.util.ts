import { type AiModelEffort } from 'kovaa-lab-shared/ai';

// `@` survives name normalization, so effort keys cannot collide with the bare model key the ceiling lookup uses
export const buildEffortLookupKey = (
  normalizedModelName: string,
  effort: AiModelEffort,
): string => `${normalizedModelName}@${effort}`;
