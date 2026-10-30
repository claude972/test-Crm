import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build, type Rollup } from 'vite';

import { createDomutilsStubPlugin } from '../worker/createDomutilsStubPlugin';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, '../..');

const sandboxBootstrapEntryPath = path.resolve(
  projectRoot,
  'src/remote/sandbox/sandbox-bootstrap.ts',
);

const generatedFile = path.resolve(
  projectRoot,
  'src/remote/sandbox/generated/frontComponentSandboxDocument.ts',
);

const replaceProcessEnvReferences = (code: string): string =>
  code
    .replace(/process\.env\.NODE_ENV/g, JSON.stringify('production'))
    .replace(/process\.env/g, '{}');

const escapeClosingScriptTags = (code: string): string =>
  code.replace(/<\/script/gi, '<\\/script');

const buildSandboxDocument = async (): Promise<void> => {
  const buildResult = await build({
    configFile: false,
    root: projectRoot,
    resolve: {
      tsconfigPaths: true,
      alias: [
        { find: /^@\//, replacement: path.resolve(projectRoot, 'src') + '/' },
      ],
    },
    worker: {
      // Vite builds a worker bundle by calling rollup with exactly the plugins
      // this function returns, so the parent config's alias plugin is not in
      // that pipeline. The worker needs its own resolver for '@/' or the
      // generated remote-elements entry cannot find its internal imports.
      plugins: () => [
        createDomutilsStubPlugin(),
        {
          name: 'resolve-renderer-source',
          async resolveId(source) {
            if (source.startsWith('@/')) {
              return this.resolve(
                path.resolve(projectRoot, 'src', source.slice(2)),
                undefined,
                { skipSelf: true },
              );
            }
          },
        },
      ],
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
      write: false,
      lib: {
        entry: sandboxBootstrapEntryPath,
        formats: ['iife'],
        name: 'frontComponentSandboxBootstrap',
        fileName: () => 'sandbox-bootstrap.js',
      },
      rollupOptions: {
        plugins: [
          {
            name: 'define-process-env',
            transform: replaceProcessEnvReferences,
          },
        ],
      },
    },
    logLevel: 'warn',
  });

  const rollupOutputs = (
    Array.isArray(buildResult) ? buildResult : [buildResult]
  ).filter((item): item is Rollup.RollupOutput => 'output' in item);

  const sandboxBootstrapChunk = rollupOutputs
    .flatMap((result) => result.output)
    .find((item): item is Rollup.OutputChunk => item.type === 'chunk');

  if (sandboxBootstrapChunk === undefined) {
    throw new Error(
      'Failed to build the front component sandbox bootstrap bundle',
    );
  }

  const sandboxBootstrapScriptTag = `<script>${escapeClosingScriptTags(sandboxBootstrapChunk.code)}</script>`;
  const sandboxDocument = `<!doctype html><html><head><meta charset="utf-8" /></head><body>${sandboxBootstrapScriptTag}</body></html>`;

  const generatedSource = `export const FRONT_COMPONENT_SANDBOX_DOCUMENT = ${JSON.stringify(
    sandboxDocument,
  )};\n`;

  fs.mkdirSync(path.dirname(generatedFile), { recursive: true });
  fs.writeFileSync(generatedFile, generatedSource, 'utf8');
};

buildSandboxDocument().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
