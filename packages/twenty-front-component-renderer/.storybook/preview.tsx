import { type Preview } from '@storybook/react-vite';
import { ThemeProvider } from 'kovaa-lab-ui/theme';

import 'kovaa-lab-ui/theme-light.css';
import 'kovaa-lab-ui/theme-dark.css';

const preview: Preview = {
  tags: ['autodocs'],
  decorators: [
    (Story) => {
      return (
        <ThemeProvider colorScheme="light">
          <Story />
        </ThemeProvider>
      );
    },
  ],
};

export default preview;
