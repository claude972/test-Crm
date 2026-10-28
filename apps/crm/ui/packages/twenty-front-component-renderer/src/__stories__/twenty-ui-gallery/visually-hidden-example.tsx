import { useState } from 'react';
import { VisuallyHidden } from 'kovaa-lab-ui/primitives/accessibility';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { Text } from 'kovaa-lab-ui/primitives/typography';

export const VisuallyHiddenExample = () => {
  const [activations, setActivations] = useState(0);

  return (
    <>
      <Button
        aria-describedby="hidden-description"
        onClick={() => setActivations((count) => count + 1)}
      >
        <VisuallyHidden
          title="Hidden action label"
          ref={(element) => {
            element?.setAttribute('data-ref-target', 'hidden-label');
          }}
          render={<span data-composed="hidden-label" />}
        >
          Add hidden record
        </VisuallyHidden>
      </Button>
      <VisuallyHidden id="hidden-description">Creates a contact</VisuallyHidden>
      <Text aria-label="Hidden action activations">{activations}</Text>
    </>
  );
};
