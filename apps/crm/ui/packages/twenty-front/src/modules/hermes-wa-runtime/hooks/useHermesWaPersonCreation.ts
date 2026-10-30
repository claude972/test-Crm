import { useCallback } from 'react';
import { CoreObjectNameSingular } from 'kovaa-lab-shared/types';

import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useCreateNewRecord } from '@/object-record/hooks/useCreateNewRecord';

export type HermesWaPersonCreation = {
  // Opens the native Person form, prefilled with the conversation's phone.
  openPrefilledPersonForm: (phoneNumber: string) => void;
};

// The CRM action for a conversation whose contact the server did not attach.
//
// It opens the NATIVE Person form — `useCreateNewRecord`, the same path the
// record index uses — prefilled with the conversation's phone, and it stops
// there. It does not create a link, does not merge anything, and does not
// create an opportunity. The attachment is the server's to make: once a Person
// with that number exists, the native matching applies on the next read, which
// is why the caller refreshes the conversation list afterwards instead of
// writing a link itself.
//
// Why this lives apart from the container: every hook below needs the
// application's own providers. `useObjectMetadataItem` throws when the Person
// metadata is not loaded, and `useCreateNewRecord` reaches through the record
// creation form context, the side panel, the workspace surface and the router.
// None of that belongs to a WhatsApp inbox, and dragging it into the container
// would make the container unmountable outside a fully booted app. So the
// container takes this action as a value, and the route-level component is
// where the native stack is touched.
//
// The phone goes into `primaryPhoneNumber` exactly as the conversation reported
// it. No calling code and no country code are filled in: the handle is a
// provider string, and deriving a country from it would be this client
// inventing a fact about the contact. The operator sees the number in the form
// and completes it.
export const useHermesWaPersonCreation = (): HermesWaPersonCreation => {
  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular: CoreObjectNameSingular.Person,
  });

  const { createNewRecord } = useCreateNewRecord({ objectMetadataItem });

  const openPrefilledPersonForm = useCallback(
    (phoneNumber: string) => {
      // Captured before the await inside createNewRecord, like every other
      // scoped value in this module.
      const capturedPhoneNumber = phoneNumber;

      void createNewRecord({
        phones: {
          primaryPhoneNumber: capturedPhoneNumber,
          primaryPhoneCallingCode: '',
          primaryPhoneCountryCode: '',
          additionalPhones: null,
        },
      });
    },
    [createNewRecord],
  );

  return { openPrefilledPersonForm };
};
