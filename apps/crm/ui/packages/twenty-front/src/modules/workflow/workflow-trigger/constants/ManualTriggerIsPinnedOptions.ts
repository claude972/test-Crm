import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { type IconComponent, IconPinned, IconPinnedOff } from 'kovaa-lab-ui/icon';

export const MANUAL_TRIGGER_IS_PINNED_OPTIONS: Array<{
  label: MessageDescriptor;
  value: boolean;
  Icon: IconComponent;
}> = [
  {
    label: msg`Not Pinned`,
    value: false,
    Icon: IconPinnedOff,
  },
  {
    label: msg`Pinned`,
    value: true,
    Icon: IconPinned,
  },
];
