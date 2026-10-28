'use client';

import { useContext } from 'react';

import { ContactCalModalContext } from './contact-cal-modal-context';
import { doNotTranslate } from 'kovaa-lab-shared/i18n';

export function useContactCalModal() {
  const value = useContext(ContactCalModalContext);
  if (value === null) {
    throw new Error(
      doNotTranslate(
        'useContactCalModal must be used within ContactCalModalRoot',
      ),
    );
  }
  return value;
}
