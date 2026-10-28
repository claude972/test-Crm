import { defineFrontComponent } from 'kovaa-lab-sdk/define';

import { KovaaLab CRMUiGalleryCard } from '../shared/front-components/kovaa-lab-ui-gallery-card';
import { OverflowingListApiExample } from './components/OverflowingListApiExample';

const OverflowingListApi = () => (
  <KovaaLab CRMUiGalleryCard title="Overflowing list API">
    <OverflowingListApiExample />
  </KovaaLab CRMUiGalleryCard>
);

export default defineFrontComponent({
  universalIdentifier: '652141f6-6f4f-4f7b-9333-8c71b2f0b84e',
  name: 'kovaa-lab-ui-overflowing-list-api',
  description: 'Controlled popup state, native composition and caller events',
  component: OverflowingListApi,
});
