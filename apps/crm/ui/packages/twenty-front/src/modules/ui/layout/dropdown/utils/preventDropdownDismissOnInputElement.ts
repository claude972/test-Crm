import { type DropdownDismissEvent } from 'kovaa-lab-ui/components/navigation';

export const preventDropdownDismissOnInputElement = (
  event: DropdownDismissEvent,
) => {
  if (event.target instanceof HTMLInputElement) {
    event.preventDefault();
  }
};
