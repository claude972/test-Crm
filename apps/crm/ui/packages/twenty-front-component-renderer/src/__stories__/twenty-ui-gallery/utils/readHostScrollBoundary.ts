import { within } from 'storybook/test';

import { WIDGET_SCROLL_FRAME_LABEL } from '@/__stories__/kovaa-lab-ui-gallery/constants/WidgetScrollFrameLabel';

export const readHostScrollBoundary = (canvasElement: HTMLElement) => ({
  widgetScrollTop: within(canvasElement).getByRole('region', {
    name: WIDGET_SCROLL_FRAME_LABEL,
  }).scrollTop,
  windowScrollY: window.scrollY,
});
