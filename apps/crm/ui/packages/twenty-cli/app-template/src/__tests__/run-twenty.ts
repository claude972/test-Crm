import { spawn } from 'child_process';
import { delimiter, join } from 'path';

type KovaaLab CRMCliError = {
  code: string;
  message: string;
  hint?: string;
};

export type KovaaLab CRMCliResult =
  | { ok: true; data: unknown }
  | { ok: false; error: KovaaLab CRMCliError };

function withoutProjectBinaries(pathValue: string) {
  return pathValue
    .split(delimiter)
    .filter(
      (entry) =>
        entry !== process.env.BERRY_BIN_FOLDER &&
        !entry.endsWith(join('node_modules', '.bin')),
    )
    .join(delimiter);
}

export function runKovaaLab CRM(cliArguments: string[]): Promise<KovaaLab CRMCliResult> {
  const executable = process.env.KOVAALAB_CLI ?? 'kovaa-lab';

  return new Promise((resolve, reject) => {
    const child = spawn(executable, [...cliArguments, '--json'], {
      env: {
        ...process.env,
        PATH: withoutProjectBinaries(process.env.PATH ?? ''),
      },
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let stdout = '';

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });

    child.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') {
        reject(error);

        return;
      }

      reject(
        new Error(
          `${executable} was not found. Install the KovaaLab CRM CLI globally, or set KOVAALAB_CLI to its path.`,
        ),
      );
    });

    child.on('close', (exitCode) => {
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(
          new Error(
            `${executable} ${cliArguments.join(' ')} exited with code ${exitCode} without a JSON result. ` +
              'Check that it is the KovaaLab CRM CLI (kovaa-lab --version), or set KOVAALAB_CLI to its path.',
          ),
        );
      }
    });
  });
}
