import { emailSchema } from 'kovaa-lab-shared/utils';

export type HermesTestDestinationVerdict =
  | { usable: true; address: string }
  | {
      usable: false;
      // Why it cannot be used, as a code; the wording lives in the component.
      code: 'test-destination-required' | 'test-destination-not-an-address';
    };

// Whether the operator typed something that can receive a test.
//
// The server validates `toAddress` as an e-mail address and applies no
// staging allowlist, no domain restriction and no recipient allowlist. So
// this check is not a safety guarantee — it only stops an address that could
// never work from being sent for the server to reject. Who receives the test
// remains entirely the operator's decision, which is why the field has no
// default value to fall back on.
//
// The same shared schema the rest of the product validates addresses with, so
// a string this accepts is one the native recipient fields accept too.
export const validateTestDestination = (
  destination: string,
): HermesTestDestinationVerdict => {
  const trimmed = destination.trim();

  if (trimmed.length === 0) {
    return { usable: false, code: 'test-destination-required' };
  }

  return emailSchema.safeParse(trimmed).success
    ? { usable: true, address: trimmed }
    : { usable: false, code: 'test-destination-not-an-address' };
};
