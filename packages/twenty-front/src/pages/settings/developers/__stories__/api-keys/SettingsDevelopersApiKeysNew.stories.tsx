import { type Meta, type StoryObj } from '@storybook/react-vite';
import { SettingsPath } from 'kovaa-lab-shared/types';

import { getSettingsPath } from 'kovaa-lab-shared/utils';
import { SettingsDevelopersApiKeysNew } from '~/pages/settings/developers/api-keys/SettingsDevelopersApiKeysNew';
import {
  PageDecorator,
  type PageDecoratorArgs,
} from '~/testing/decorators/PageDecorator';
import { graphqlMocks } from '~/testing/graphqlMocks';

const meta: Meta<PageDecoratorArgs> = {
  title: 'Pages/Settings/ApiKeys/SettingsDevelopersApiKeysNew',
  component: SettingsDevelopersApiKeysNew,
  decorators: [PageDecorator],
  args: { routePath: getSettingsPath(SettingsPath.NewApiKey) },
  parameters: {
    msw: graphqlMocks,
  },
};

export default meta;

export type Story = StoryObj<typeof SettingsDevelopersApiKeysNew>;
