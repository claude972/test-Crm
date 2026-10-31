import { execFileSync } from 'child_process';
import { generateMessageId } from 'kovaa-lab-shared/i18n';
import { STANDARD_OBJECT_FIELDS } from 'kovaa-lab-shared/metadata';
import { join } from 'path';

import { STANDARD_SELECT_OPTION_LABELS } from '@/object-metadata/constants/StandardSelectOptionLabels';

const CONSTANT_PATH = join(__dirname, '..', 'StandardSelectOptionLabels.ts');

const STAGE_FIELD = STANDARD_OBJECT_FIELDS.opportunity.stage
  .universalIdentifier as string;

// The sibling guards in translateStandardSelectOptionLabel.test.ts assert the
// shape this file must keep. Only compiling it proves the build keeps it: the
// Lingui plugin reduces a descriptor to its id under NODE_ENV=production, which
// once left the whole feature inert with every dev test still green.
// A child process on purpose -- inside Jest the swc plugin host is already
// loaded by Jest's own transformer, so NODE_ENV never reaches the plugin and the
// compile silently stays in dev mode.
const compileForProduction = (): string => {
  const script = `
    const fs = require('fs');
    const swc = require(${JSON.stringify(require.resolve('@swc/core'))});
    const file = ${JSON.stringify(CONSTANT_PATH)};
    process.stdout.write(
      swc.transformSync(fs.readFileSync(file, 'utf8'), {
        filename: file,
        jsc: {
          parser: { syntax: 'typescript', tsx: false },
          target: 'es2022',
          experimental: { plugins: [['@lingui/swc-plugin', {}]] },
        },
      }).code,
    );
  `;

  return execFileSync(process.execPath, ['-e', script], {
    cwd: join(__dirname, '..', '..', '..', '..', '..'),
    env: { ...process.env, NODE_ENV: 'production' },
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
};

const readCompiledEntries = (
  compiled: string,
): { sourceLabel: string; messageId: string }[] =>
  [
    ...compiled.matchAll(
      /sourceLabel:\s*'([^']+)',\s*shippedLabel:[^{]*\{\s*id:\s*"([^"]+)"/g,
    ),
  ].map(([, sourceLabel, messageId]) => ({ sourceLabel, messageId }));

describe('StandardSelectOptionLabels under a production build', () => {
  const compiled = compileForProduction();
  const compiledEntries = readCompiledEntries(compiled);

  it('reads as many entries as the module exports', () => {
    expect(compiledEntries).toHaveLength(
      STANDARD_SELECT_OPTION_LABELS[STAGE_FIELD].length,
    );
  });

  it('really is a production compile, which is the premise of the rest', () => {
    // every descriptor reduced to an id: if this stops holding, re-read the plugin
    expect(compiled).toContain('shippedLabel');
    expect(compiled).not.toMatch(/shippedLabel:[^}]*message:/);
  });

  it('keeps every shipped wording as a plain string the comparison can read', () => {
    expect(compiledEntries.map(({ sourceLabel }) => sourceLabel)).toEqual(
      STANDARD_SELECT_OPTION_LABELS[STAGE_FIELD].map(
        ({ sourceLabel }) => sourceLabel,
      ),
    );
  });

  it('compiles each descriptor to the catalog id derived from that wording', () => {
    expect(compiledEntries).toEqual(
      compiledEntries.map(({ sourceLabel }) => ({
        sourceLabel,
        messageId: generateMessageId(sourceLabel, 'fieldMetadata.label'),
      })),
    );
  });
});
