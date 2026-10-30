import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  runIntegration,
  SAME_ORIGIN_SUITE,
} from "./check-hermes-integration-p0.mjs";

// This wrapper owns the mode and exact suite. Ambient env and CLI flags cannot widen it.
export const runTenancyIntegration = () =>
  runIntegration({
    sameOriginMultiworkspace: true,
    suites: [SAME_ORIGIN_SUITE],
  });

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await runTenancyIntegration();
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Tenancy integration failed",
    );
    process.exitCode = 1;
  }
}
