import { createRequire } from 'node:module';
import { join } from 'node:path';
import { isDefined } from 'kovaa-lab-shared/utils';

import { type PullWrite } from '@/app/pull/plan-pull-writes';
import { CliError } from '@/output/cli-error';

export const assertPullSdkExports = ({
  appPath,
  writes,
}: {
  appPath: string;
  writes: Pick<PullWrite, 'requiredSdkExports'>[];
}) => {
  const requiredNames = new Set(
    writes.flatMap((write) => write.requiredSdkExports),
  );

  if (requiredNames.size === 0) {
    return;
  }

  const defineExports: Record<string, unknown> = createRequire(
    join(appPath, 'package.json'),
  )('kovaa-lab-sdk/define');

  const missingNames = [...requiredNames]
    .filter((name) => !isDefined(defineExports[name]))
    .sort();

  if (missingNames.length > 0) {
    throw new CliError({
      code: 'SDK_SOURCE_UNSUPPORTED',
      message: `The app's kovaa-lab-sdk cannot read the generated definitions. Missing exports: ${missingNames.join(', ')}.`,
      hint: 'Upgrade the app to a compatible kovaa-lab-sdk version (2.40.0 or later).',
      details: { missingNames },
    });
  }
};
