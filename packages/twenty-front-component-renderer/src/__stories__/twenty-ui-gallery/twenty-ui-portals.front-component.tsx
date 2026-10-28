import { useState } from 'react';
import { createPortal } from 'react-dom';
import { defineFrontComponent } from 'kovaa-lab-sdk/define';
import { Dropdown } from 'kovaa-lab-ui/components/navigation';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { Text } from 'kovaa-lab-ui/primitives/typography';

import { KovaaLab CRMUiGalleryCard } from '@/__stories__/shared/front-components/kovaa-lab-ui-gallery-card';

const OVERSIZED_PORTAL_EXTENT = 4000;
const OVERSIZED_PORTAL_OFFSET = -1000;
const OVERSIZED_PORTAL_Z_INDEX = 2147483647;
const MENU_ITEM_LABELS = Array.from(
  { length: 16 },
  (_, itemIndex) => `Menu item ${itemIndex + 1}`,
);

const PortalsExample = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isOversizedOpen, setIsOversizedOpen] = useState(false);
  const [actionCount, setActionCount] = useState(0);

  return (
    <KovaaLab CRMUiGalleryCard title="Portals">
      <Dropdown.Root type="menu">
        <Dropdown.Trigger render={<Button>Open menu</Button>} />
        <Dropdown.Content>
          {MENU_ITEM_LABELS.map((menuItemLabel) => (
            <Dropdown.ActionItem key={menuItemLabel}>
              {menuItemLabel}
            </Dropdown.ActionItem>
          ))}
        </Dropdown.Content>
      </Dropdown.Root>
      <Button onClick={() => setIsOpen(!isOpen)}>Toggle popup</Button>
      <Button onClick={() => setIsOversizedOpen(!isOversizedOpen)}>
        Fill portal area
      </Button>
      <Text role="status" aria-label="Portal actions">
        Portal actions: {actionCount}
      </Text>
      {isOpen &&
        createPortal(
          <div style={{ position: 'absolute', top: '100%', left: 0 }}>
            <Button onClick={() => setActionCount(actionCount + 1)}>
              Portal action
            </Button>
          </div>,
          document.body,
        )}
      {isOversizedOpen &&
        createPortal(
          <Button
            aria-label="Oversized portal"
            onClick={() => setIsOversizedOpen(false)}
            style={{
              position: 'fixed',
              top: OVERSIZED_PORTAL_OFFSET,
              left: OVERSIZED_PORTAL_OFFSET,
              width: OVERSIZED_PORTAL_EXTENT,
              height: OVERSIZED_PORTAL_EXTENT,
              maxWidth: 'none',
              maxHeight: 'none',
              zIndex: OVERSIZED_PORTAL_Z_INDEX,
              background: '#f00080',
            }}
          >
            Oversized portal
          </Button>,
          document.body,
        )}
    </KovaaLab CRMUiGalleryCard>
  );
};

export default defineFrontComponent({
  universalIdentifier: 'd6a7d90d-30e8-46c0-8d91-71b1cb33a1c7',
  name: 'kovaa-lab-ui-portals',
  description: 'Body portal visibility, interaction and bounded rendering',
  component: PortalsExample,
});
