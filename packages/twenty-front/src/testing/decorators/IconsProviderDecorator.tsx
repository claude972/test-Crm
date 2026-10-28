import { type Decorator } from '@storybook/react-vite';
import { IconsProvider } from 'kovaa-lab-ui/icon';

export const IconsProviderDecorator: Decorator = (Story) => {
  return (
    <IconsProvider>
      <Story />
    </IconsProvider>
  );
};
