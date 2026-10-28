import { useState } from 'react';
import { defineFrontComponent } from 'kovaa-lab-sdk/define';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { Text } from 'kovaa-lab-ui/primitives/typography';
import { useIsMobile, useIsTouchDevice } from 'kovaa-lab-ui/utilities';
import 'kovaa-lab-ui/style.css';

const ResponsiveHooks = () => {
  const isMobile = useIsMobile();
  const isTouchDevice = useIsTouchDevice();
  const [activations, setActivations] = useState(0);

  return (
    <>
      <Text>Mobile layout: {String(isMobile)}</Text>
      <Text>Touch input: {String(isTouchDevice)}</Text>
      <Button shortcut={['S']} onClick={() => setActivations(activations + 1)}>
        Save record
      </Button>
      <Button onClick={() => setActivations(activations + 1)}>
        {isTouchDevice ? 'Tap action' : 'Pointer action'}
      </Button>
      <Text>Activations: {activations}</Text>
    </>
  );
};

export default defineFrontComponent({
  universalIdentifier: 'f1cdb7cb-79db-421c-bfb6-9f7c20f03ad1',
  name: 'kovaa-lab-ui-responsive-hooks',
  description: 'Responsive hooks evaluated against the widget box',
  component: ResponsiveHooks,
});
