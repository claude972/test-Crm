import { useState } from 'react';
import { defineFrontComponent } from 'kovaa-lab-sdk/define';
import { Select } from 'kovaa-lab-ui/primitives/input';

import { KovaaLab CRMUiGalleryCard } from '@/__stories__/shared/front-components/kovaa-lab-ui-gallery-card';
import { SCROLLING_OPTION_LABELS } from '@/__stories__/kovaa-lab-ui-gallery/constants/ScrollingOptionLabels';

const SELECTED_OPTION_LABEL = 'Option 30';

const ScrollingSelect = ({
  label,
  alignItemWithTrigger,
}: {
  label: string;
  alignItemWithTrigger?: boolean;
}) => {
  const [value, setValue] = useState<string | null>(SELECTED_OPTION_LABEL);

  return (
    <Select.Root value={value} onValueChange={setValue}>
      <Select.Trigger aria-label={label}>
        <Select.Value />
        <Select.Icon />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          sideOffset={8}
          alignItemWithTrigger={alignItemWithTrigger}
        >
          <Select.Popup style={{ maxBlockSize: 160 }}>
            <Select.List aria-label={`${label} options`}>
              {SCROLLING_OPTION_LABELS.map((optionLabel) => (
                <Select.Item key={optionLabel} value={optionLabel}>
                  <Select.ItemText>{optionLabel}</Select.ItemText>
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
};

const SelectScrollingExample = () => (
  <KovaaLab CRMUiGalleryCard title="Select scrolling">
    <ScrollingSelect label="Unaligned option" alignItemWithTrigger={false} />
    <ScrollingSelect label="Aligned option" />
  </KovaaLab CRMUiGalleryCard>
);

export default defineFrontComponent({
  universalIdentifier: 'a9f0cbce-f475-42b3-acf2-7b7aa7dd7a9a',
  name: 'kovaa-lab-ui-select-scrolling',
  description:
    'Select selected option reveal, keyboard navigation and trigger alignment scrolling',
  component: SelectScrollingExample,
});
