import { createCssInjectionPlugin } from 'kovaa-lab-shared/front-component-build';

import { getWatchInputPlugins } from '@/app/dev/collect-watch-inputs';

export const cssInjectionPlugin = createCssInjectionPlugin({
  getBuildPlugins: getWatchInputPlugins,
});
