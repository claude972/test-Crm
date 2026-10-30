import { defineFrontComponent } from 'kovaa-lab-sdk/define';

import { KovaaLabCRMUiGalleryCard } from '../shared/front-components/twenty-ui-gallery-card';
import { OverflowingListApiExample } from './components/OverflowingListApiExample';

const OverflowingListApi = () => (
  <KovaaLabCRMUiGalleryCard title="Overflowing list API">
    <OverflowingListApiExample />
  </KovaaLabCRMUiGalleryCard>
);

export default defineFrontComponent({
  universalIdentifier: '652141f6-6f4f-4f7b-9333-8c71b2f0b84e',
  name: 'kovaa-lab-ui-overflowing-list-api',
  description: 'Controlled popup state, native composition and caller events',
  component: OverflowingListApi,
});
