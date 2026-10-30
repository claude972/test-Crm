import { defineFrontComponent } from 'kovaa-lab-sdk/define';
import { ListItem } from 'kovaa-lab-ui/primitives/navigation';
import { ThemeProvider } from 'kovaa-lab-ui/theme';

import { KovaaLabCRMUiGalleryCard } from '@/__stories__/shared/front-components/twenty-ui-gallery-card';
import { ListItemButtonExample } from '@/__stories__/twenty-ui-gallery/list-item-button-example';
import { ListItemOwnerExample } from '@/__stories__/twenty-ui-gallery/list-item-owner-example';
import { ListItemPopupOwnerExample } from '@/__stories__/twenty-ui-gallery/list-item-popup-owner-example';
import { ListItemPresentationExample } from '@/__stories__/twenty-ui-gallery/list-item-presentation-example';

const OVERFLOW_ROW_STYLE = { width: 160 };

const ListItemExample = () => (
  <KovaaLabCRMUiGalleryCard title="ListItem">
    <ListItemButtonExample />
    <ListItemOwnerExample />
    <ListItemPresentationExample />
    <ListItemPopupOwnerExample />
    <ThemeProvider colorScheme="light" applyToRoot={false}>
      <ListItem style={OVERFLOW_ROW_STYLE}>
        A long workspace preference that overflows its row
      </ListItem>
    </ThemeProvider>
  </KovaaLabCRMUiGalleryCard>
);

export default defineFrontComponent({
  universalIdentifier: '4d23e9af-7cb3-4e4a-bbca-8e960f840003',
  name: 'kovaa-lab-ui-list-item',
  description:
    'ListItemButton actions and ListItem rows with explicit native owners',
  component: ListItemExample,
});
