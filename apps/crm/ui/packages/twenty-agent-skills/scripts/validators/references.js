import fs from 'node:fs';
import path from 'node:path';

import { PLUGIN_ROOT, readText } from './lib.js';

const REQUIRED_REFERENCES = [
  'references/design/front-component-ui.md',
  'references/develop-app/app-structure.md',
  'references/develop-app/data-model.md',
  'references/develop-app/front-components.md',
  'references/develop-app/logic.md',
  'references/develop-app/layout.md',
  'references/develop-app/standalone-pages.md',
  'references/develop-app/tests.md',
  'references/develop-app/workflows.md',
  'references/manage-app/cli-and-sync.md',
  'references/publish-app/prepare-for-app-store.md',
  'references/concepts/how-apps-work.md',
  'references/concepts/operating-rules.md',
  'references/use-kovaa-lab-mcp/setup.md',
  'references/use-kovaa-lab-mcp/result-formatting.md',
];

const assertReferences = (fail) => {
  for (const relativePath of REQUIRED_REFERENCES) {
    const absolutePath = path.join(PLUGIN_ROOT, relativePath);

    if (!fs.existsSync(absolutePath)) {
      fail(`required reference is missing: ${relativePath}`);
    }
  }
};

const assertHowAppsWork = (fail) => {
  const howAppsWorkPath = path.join(
    PLUGIN_ROOT,
    'references/concepts/how-apps-work.md',
  );

  if (!fs.existsSync(howAppsWorkPath)) {
    fail('required reference is missing: references/concepts/how-apps-work.md');
    return;
  }

  const howAppsWork = readText(howAppsWorkPath);

  const requiredFragments = [
    '# How KovaaLab CRM Apps Work',
    '## What Is A KovaaLab CRM App',
    'standalone npm package',
    '## SDK Packages',
    'kovaa-lab-sdk',
    'kovaa-lab-client-sdk',
    '## KovaaLab CRM Instances And Remotes',
    '## Local Development Environment',
    '## App Lifecycle',
    'kovaa-lab app init',
    '## Front Component Rendering',
    'Remote DOM',
    '## App File Structure',
    'application-config.ts',
    '## Sharing An App',
    '## Key Concepts',
    'Universal identifiers',
  ];

  for (const fragment of requiredFragments) {
    if (!howAppsWork.includes(fragment)) {
      fail(`how-apps-work.md is missing foundational guidance: ${fragment}`);
    }
  }

  // use-kovaa-lab-mcp is intentionally excluded: it covers consuming the KovaaLab CRM MCP
  // server to retrieve and present workspace records, not building apps, so the
  // app-foundations doc (how-apps-work.md) is not a relevant prerequisite for it.
  const skillsToCheck = [
    'skills/create-app/SKILL.md',
    'skills/develop-app/SKILL.md',
    'skills/manage-app/SKILL.md',
    'skills/publish-app/SKILL.md',
  ];

  for (const skillRelPath of skillsToCheck) {
    const skillPath = path.join(PLUGIN_ROOT, skillRelPath);

    if (!fs.existsSync(skillPath)) {
      fail(`required skill is missing: ${skillRelPath}`);
      continue;
    }

    const skill = readText(skillPath);

    if (!skill.includes('references/concepts/how-apps-work.md')) {
      fail(`${skillRelPath} must reference how-apps-work.md`);
    }

    if (!skill.includes('references/concepts/operating-rules.md')) {
      fail(`${skillRelPath} must reference operating-rules.md`);
    }
  }
};

export { REQUIRED_REFERENCES, assertReferences, assertHowAppsWork };
