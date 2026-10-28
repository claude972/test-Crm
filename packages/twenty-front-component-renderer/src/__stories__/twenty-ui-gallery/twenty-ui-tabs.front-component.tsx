import { defineFrontComponent } from 'kovaa-lab-sdk/define';

import { KovaaLab CRMUiGalleryCard } from '@/__stories__/shared/front-components/kovaa-lab-ui-gallery-card';
import { TabButtonContractsExample } from '@/__stories__/kovaa-lab-ui-gallery/tab-button-contracts-example';
import { TabsContractsExample } from '@/__stories__/kovaa-lab-ui-gallery/tabs-contracts-example';

const TabsExample = () => (
  <KovaaLab CRMUiGalleryCard title="Tabs">
    <TabsContractsExample />
    <TabButtonContractsExample />
  </KovaaLab CRMUiGalleryCard>
);

export default defineFrontComponent({
  universalIdentifier: '4d23e9af-7cb3-4e4a-bbca-8e960f840004',
  name: 'kovaa-lab-ui-tabs',
  description: 'Tabs panels, keyboard selection, and route or action controls',
  component: TabsExample,
});
