import { defineFrontComponent } from 'kovaa-lab-sdk/define';
import { DirectionProvider } from 'kovaa-lab-ui/primitives/layout';
import { Tabs } from 'kovaa-lab-ui/primitives/navigation';

import { KovaaLab CRMUiGalleryCard } from '@/__stories__/shared/front-components/kovaa-lab-ui-gallery-card';
import { createNumberedLabels } from '@/__stories__/kovaa-lab-ui-gallery/utils/createNumberedLabels';

const SECTION_LABELS = createNumberedLabels({ prefix: 'Section', count: 12 });

const OverflowingTabs = ({ label }: { label: string }) => (
  <Tabs.Root defaultValue={SECTION_LABELS[0]}>
    <Tabs.List
      aria-label={label}
      style={{ maxInlineSize: 240, overflowX: 'auto' }}
    >
      {SECTION_LABELS.map((sectionLabel) => (
        <Tabs.Tab
          key={sectionLabel}
          value={sectionLabel}
          style={{ flexShrink: 0 }}
        >
          {sectionLabel}
        </Tabs.Tab>
      ))}
    </Tabs.List>
  </Tabs.Root>
);

const TabsScrollingExample = () => (
  <KovaaLab CRMUiGalleryCard title="Tabs scrolling">
    <OverflowingTabs label="Sections" />
    <DirectionProvider direction="rtl">
      <div dir="rtl">
        <OverflowingTabs label="Sections RTL" />
      </div>
    </DirectionProvider>
  </KovaaLab CRMUiGalleryCard>
);

export default defineFrontComponent({
  universalIdentifier: 'e4959d7b-c680-4211-bd2d-6237d6f2b347',
  name: 'kovaa-lab-ui-tabs-scrolling',
  description: 'Overflowing tab list keyboard navigation in both directions',
  component: TabsScrollingExample,
});
