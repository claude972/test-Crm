import { defineFrontComponent } from 'kovaa-lab-sdk/define';
import { ListItem } from 'kovaa-lab-ui/primitives/navigation';
import { ThemeProvider } from 'kovaa-lab-ui/theme';

import { KovaaLab CRMUiGalleryCard } from '@/__stories__/shared/front-components/kovaa-lab-ui-gallery-card';
import { ListItemButtonExample } from '@/__stories__/kovaa-lab-ui-gallery/list-item-button-example';
import { ListItemOwnerExample } from '@/__stories__/kovaa-lab-ui-gallery/list-item-owner-example';
import { ListItemPopupOwnerExample } from '@/__stories__/kovaa-lab-ui-gallery/list-item-popup-owner-example';
import { ListItemPresentationExample } from '@/__stories__/kovaa-lab-ui-gallery/list-item-presentation-example';

const OVERFLOW_ROW_STYLE = { width: 160 };

const ListItemExample = () => (
  <KovaaLab CRMUiGalleryCard title="ListItem">
    <ListItemButtonExample />
    <ListItemOwnerExample />
    <ListItemPresentationExample />
    <ListItemPopupOwnerExample />
    <ThemeProvider colorScheme="light" applyToRoot={false}>
      <ListItem style={OVERFLOW_ROW_STYLE}>
        A long workspace preference that overflows its row
      </ListItem>
    </ThemeProvider>
  </KovaaLab CRMUiGalleryCard>
);

export default defineFrontComponent({
  universalIdentifier: '4d23e9af-7cb3-4e4a-bbca-8e960f840003',
  name: 'kovaa-lab-ui-list-item',
  description:
    'ListItemButton actions and ListItem rows with explicit native owners',
  component: ListItemExample,
});
