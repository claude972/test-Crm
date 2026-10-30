import { defineFrontComponent } from 'kovaa-lab-sdk/define';

import { KovaaLabCRMUiGalleryCard } from '@/__stories__/shared/front-components/twenty-ui-gallery-card';
import { TabButtonContractsExample } from '@/__stories__/twenty-ui-gallery/tab-button-contracts-example';
import { TabsContractsExample } from '@/__stories__/twenty-ui-gallery/tabs-contracts-example';

const TabsExample = () => (
  <KovaaLabCRMUiGalleryCard title="Tabs">
    <TabsContractsExample />
    <TabButtonContractsExample />
  </KovaaLabCRMUiGalleryCard>
);

export default defineFrontComponent({
  universalIdentifier: '4d23e9af-7cb3-4e4a-bbca-8e960f840004',
  name: 'kovaa-lab-ui-tabs',
  description: 'Tabs panels, keyboard selection, and route or action controls',
  component: TabsExample,
});
