import { HermesWaInboxContainer } from '@/hermes-wa-runtime/components/HermesWaInboxContainer';
import { useHermesWaPersonCreation } from '@/hermes-wa-runtime/hooks/useHermesWaPersonCreation';

// The WhatsApp inbox as a route mounts it.
//
// This is the container plus the one thing the container cannot carry on its
// own: the native Person form. `useHermesWaPersonCreation` reaches through the
// object metadata, the record creation form context, the side panel and the
// router, so it needs a fully booted application around it. Keeping it in this
// thin layer is what lets the container be mounted — and tested — against
// nothing but an Apollo provider.
//
// A route renders this. Everything else about the surface lives in the
// container.
export const HermesWaInboxRuntime = () => {
  const { openPrefilledPersonForm } = useHermesWaPersonCreation();

  return (
    <HermesWaInboxContainer
      onCreateContactRequested={openPrefilledPersonForm}
    />
  );
};
