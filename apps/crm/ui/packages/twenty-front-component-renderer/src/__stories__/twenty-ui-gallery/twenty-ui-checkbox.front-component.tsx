import { createElement, useRef, useState } from 'react';
import { defineFrontComponent } from 'kovaa-lab-sdk/define';
import { Checkbox } from 'kovaa-lab-ui/primitives/input';

import { isDefined } from 'kovaa-lab-ui/utilities';

import { KovaaLab CRMUiGalleryCard } from '@/__stories__/shared/front-components/kovaa-lab-ui-gallery-card';

const CheckboxExample = () => {
  const [checked, setChecked] = useState(false);
  const [changeCount, setChangeCount] = useState(0);

  const rootRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const partRef = useRef<HTMLSpanElement>(null);
  const [composition, setComposition] = useState('pending');

  return (
    <KovaaLab CRMUiGalleryCard title="Checkbox">
      <Checkbox.Root
        ref={rootRef}
        inputRef={inputRef}
        render={(props, state) =>
          createElement('span', {
            ...props,
            'data-active': String(state.checked),
          })
        }
        aria-label="Select account"
        checked={checked}
        onCheckedChange={(nextChecked, details) => {
          setChecked(nextChecked);
          setComposition(
            `${details.event.type}/${isDefined(rootRef.current) && isDefined(inputRef.current) && isDefined(partRef.current)}`,
          );
          setChangeCount((count) => count + 1);
        }}
      >
        <Checkbox.Indicator
          ref={partRef}
          keepMounted
          render={(props, state) =>
            createElement('span', {
              ...props,
              'data-active': String(state.checked),
            })
          }
        />
      </Checkbox.Root>
      <Checkbox aria-label="Uncontrolled selection" defaultChecked />
      <Checkbox.Root aria-label="Partial selection" indeterminate>
        <Checkbox.Indicator
          render={(props, state) =>
            createElement(
              'span',
              props,
              state.indeterminate ? 'Mixed selection' : 'Selected',
            )
          }
        />
      </Checkbox.Root>
      <Checkbox aria-label="Disabled selection" disabled />
      <Checkbox aria-label="Read-only selection" defaultChecked readOnly />
      <p role="status">
        Selection: {checked ? 'selected' : 'unselected'}; Changes: {changeCount}
        ; Composition: {composition}
      </p>
    </KovaaLab CRMUiGalleryCard>
  );
};

export default defineFrontComponent({
  universalIdentifier: '4d23e9af-7cb3-4e4a-bbca-8e960f840011',
  name: 'kovaa-lab-ui-checkbox',
  description: 'Checkbox state and interaction behavior in the sandbox',
  component: CheckboxExample,
});
