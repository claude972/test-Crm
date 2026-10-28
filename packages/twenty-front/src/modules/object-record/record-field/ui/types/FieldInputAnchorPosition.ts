import { type ComponentProps, type RefObject } from 'react';
import { type Dropdown } from 'kovaa-lab-ui/components/navigation';

export type FieldInputAnchorPosition = Pick<
  ComponentProps<typeof Dropdown.Content>,
  'align' | 'sideOffset' | 'alignOffset' | 'collisionPadding'
> & {
  anchorRef: RefObject<Element | null>;
};
