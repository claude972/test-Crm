import { type AiModelEffort } from 'kovaa-lab-shared/ai';

import { type AiModelBenchmark } from 'src/engine/metadata-modules/ai/ai-models/types/ai-model-benchmark.type';

import { type BenchmarkOverlayReading } from './benchmark-overlay-entry.type';

export type BenchmarkMatch = {
  benchmark: AiModelBenchmark;
  aliases: string[];
  benchmarkByEffort?: Partial<Record<AiModelEffort, BenchmarkOverlayReading>>;
};
