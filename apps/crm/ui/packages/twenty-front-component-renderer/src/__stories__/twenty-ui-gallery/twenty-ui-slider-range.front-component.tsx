import { useState } from 'react';
import { defineFrontComponent } from 'kovaa-lab-sdk/define';
import { Slider } from 'kovaa-lab-ui/primitives/input';
import { Text } from 'kovaa-lab-ui/primitives/typography';

import { KovaaLab CRMUiGalleryCard } from '@/__stories__/shared/front-components/kovaa-lab-ui-gallery-card';

const SliderRangeExample = () => {
  const [value, setValue] = useState<readonly number[]>([20, 80]);
  const [committedValue, setCommittedValue] = useState<readonly number[]>([
    20, 80,
  ]);

  return (
    <KovaaLab CRMUiGalleryCard title="Slider range">
      <Slider.Root
        value={value}
        onValueChange={setValue}
        onValueCommitted={setCommittedValue}
      >
        <Slider.Label>Price range</Slider.Label>
        <Slider.Value />
        <Slider.Control data-testid="range-control">
          <Slider.Track>
            <Slider.Indicator />
            <Slider.Thumb index={0} aria-label="Minimum price" />
            <Slider.Thumb index={1} aria-label="Maximum price" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <Text>
        Range: {value.join(', ')}; Committed range: {committedValue.join(', ')}
      </Text>
    </KovaaLab CRMUiGalleryCard>
  );
};

export default defineFrontComponent({
  universalIdentifier: '4d23e9af-7cb3-4e4a-bbca-8e960f840013',
  name: 'kovaa-lab-ui-slider-range',
  description: 'Slider range thumb registration in the sandbox',
  component: SliderRangeExample,
});
