import fs from 'node:fs';
import path from 'node:path';

import {
  PLUGIN_ROOT,
  REPO_ROOT,
  PUBLIC_DOCS_MCP_SERVER_NAME,
  PUBLIC_DOCS_MCP_URL,
  VALID_CAPABILITIES,
  VALID_CATEGORIES,
  SHORT_DESCRIPTION_MAX,
  readText,
  listFiles,
  isAllowedDocumentationHost,
  createJsonReaders,
} from './lib.js';

const assertJsonMetadata = (fail) => {
  const { readJson, readOptionalJson } = createJsonReaders(fail);
  const packageJson = readJson('packages/kovaa-lab-agent-skills/package.json');
  const pluginJson = readJson('packages/kovaa-lab-agent-skills/.codex-plugin/plugin.json');
  const mcpJson = readJson('packages/kovaa-lab-agent-skills/.mcp.json');
  const marketplaceJson = readOptionalJson('.agents/plugins/marketplace.json');

  if (packageJson?.version !== pluginJson?.version) {
    fail('package.json version must match .codex-plugin/plugin.json version');
  }

  if (!packageJson?.files?.includes('.mcp.json')) {
    fail('package.json files must include .mcp.json for the public docs MCP server');
  }

  if (!packageJson?.files?.includes('references')) {
    fail('package.json files must include references for shared plugin guidance');
  }

  if (pluginJson?.mcpServers !== './.mcp.json') {
    fail('.codex-plugin/plugin.json must declare mcpServers as ./.mcp.json');
  }

  const servers = mcpJson?.mcpServers;

  if (!servers || typeof servers !== 'object' || Array.isArray(servers)) {
    fail('.mcp.json must declare an mcpServers object');
  } else {
    const serverNames = Object.keys(servers);

    if (serverNames.length !== 1 || serverNames[0] !== PUBLIC_DOCS_MCP_SERVER_NAME) {
      fail(`.mcp.json must only declare ${PUBLIC_DOCS_MCP_SERVER_NAME}`);
    }

    const docsServer = servers[PUBLIC_DOCS_MCP_SERVER_NAME];

    if (!docsServer || typeof docsServer !== 'object' || Array.isArray(docsServer)) {
      fail(`${PUBLIC_DOCS_MCP_SERVER_NAME} must be an object`);
    } else {
      const docsServerKeys = Object.keys(docsServer);

      if (docsServerKeys.length !== 1 || docsServerKeys[0] !== 'url') {
        fail(`${PUBLIC_DOCS_MCP_SERVER_NAME} must only declare a url`);
      }

      if (docsServer.url !== PUBLIC_DOCS_MCP_URL) {
        fail(`${PUBLIC_DOCS_MCP_SERVER_NAME} url must be ${PUBLIC_DOCS_MCP_URL}`);
      }
    }
  }

  const marketplaceEntry = marketplaceJson?.plugins?.find((entry) => entry.name === 'kovaa-lab');

  if (marketplaceJson && !marketplaceEntry) {
    fail('.agents/plugins/marketplace.json includes plugins but not the kovaa-lab plugin entry');
  } else if (marketplaceEntry && marketplaceEntry.source?.path !== './packages/kovaa-lab-agent-skills/dist') {
    fail('marketplace kovaa-lab source path must be ./packages/kovaa-lab-agent-skills/dist');
  }

  if (fs.existsSync(path.join(REPO_ROOT, 'plugins', 'kovaa-lab'))) {
    fail('legacy plugins/kovaa-lab path must not exist; use packages/kovaa-lab-agent-skills/dist');
  }
};

const assertNoBundledMcpConfig = (fail) => {
  const gitignorePath = path.join(PLUGIN_ROOT, '.gitignore');

  if (fs.existsSync(gitignorePath) && readText(gitignorePath).split(/\r?\n/).includes('.mcp.json')) {
    fail('packages/kovaa-lab-agent-skills/.gitignore must not ignore the public .mcp.json');
  }

  for (const filePath of listFiles(PLUGIN_ROOT)) {
    const relativePath = path.relative(PLUGIN_ROOT, filePath);

    if (relativePath.split(path.sep).includes('__tests__')) {
      continue;
    }

    if (path.basename(filePath) === '.mcp.json' && relativePath !== '.mcp.json') {
      fail(`workspace-specific MCP config must not be shipped: ${relativePath}`);
    }

    if (path.basename(filePath) === '.app.json') {
      fail(`app declarations must not be shipped unless intentionally allowed in validation: ${relativePath}`);
    }

    const contents = readText(filePath);

    const urls = contents.matchAll(/https?:\/\/[^\s"`'<>)]*/g);

    for (const [rawUrl] of urls) {
      let parsedUrl;

      if (/[${}*]/.test(rawUrl)) {
        continue;
      }

      try {
        parsedUrl = new URL(rawUrl);
      } catch {
        continue;
      }

      if (!isAllowedDocumentationHost(parsedUrl.hostname)) {
        fail(`non-placeholder URL found in ${relativePath}: ${parsedUrl.origin}`);
      }
    }

    if (/Bearer\s+(?!YOUR_API_KEY\b)[A-Za-z0-9._-]{20,}/.test(contents)) {
      fail(`possible bearer token found in ${relativePath}`);
    }

    if (/sk-[A-Za-z0-9_-]{20,}/.test(contents)) {
      fail(`possible API key found in ${relativePath}`);
    }
  }
};

const assertInterfaceFields = (fail) => {
  const { readJson } = createJsonReaders(fail);
  const pluginJson = readJson('packages/kovaa-lab-agent-skills/.codex-plugin/plugin.json');
  const interfaceMetadata = pluginJson?.interface;

  if (!interfaceMetadata || typeof interfaceMetadata !== 'object' || Array.isArray(interfaceMetadata)) {
    fail('.codex-plugin/plugin.json must declare an interface object');
    return;
  }

  const requiredStringFields = [
    'displayName',
    'shortDescription',
    'longDescription',
    'developerName',
    'category',
    'websiteURL',
    'privacyPolicyURL',
    'termsOfServiceURL',
    'brandColor',
    'logo',
    'composerIcon',
  ];

  for (const field of requiredStringFields) {
    const value = interfaceMetadata[field];

    if (typeof value !== 'string' || value.trim().length === 0) {
      fail(`.codex-plugin/plugin.json interface.${field} must be a non-empty string`);
    }
  }

  if (typeof interfaceMetadata.shortDescription === 'string' && interfaceMetadata.shortDescription.length > SHORT_DESCRIPTION_MAX) {
    fail(`.codex-plugin/plugin.json interface.shortDescription must be ${SHORT_DESCRIPTION_MAX} characters or fewer`);
  }

  if (typeof interfaceMetadata.brandColor === 'string' && !/^#[0-9a-fA-F]{6}$/.test(interfaceMetadata.brandColor)) {
    fail('.codex-plugin/plugin.json interface.brandColor must match #RRGGBB hex format');
  }

  if (typeof interfaceMetadata.category === 'string' && !VALID_CATEGORIES.has(interfaceMetadata.category)) {
    fail(`.codex-plugin/plugin.json interface.category must be one of: ${[...VALID_CATEGORIES].join(', ')}`);
  }

  if (!Array.isArray(interfaceMetadata.capabilities) || interfaceMetadata.capabilities.length === 0) {
    fail('.codex-plugin/plugin.json interface.capabilities must be a non-empty array');
  } else {
    for (const capability of interfaceMetadata.capabilities) {
      if (!VALID_CAPABILITIES.has(capability)) {
        fail(`.codex-plugin/plugin.json interface.capabilities contains invalid value: ${capability}`);
      }
    }
  }

  if (!Array.isArray(interfaceMetadata.defaultPrompt) || interfaceMetadata.defaultPrompt.length === 0) {
    fail('.codex-plugin/plugin.json interface.defaultPrompt must be a non-empty array of strings');
  } else {
    for (const prompt of interfaceMetadata.defaultPrompt) {
      if (typeof prompt !== 'string' || prompt.trim().length === 0) {
        fail('.codex-plugin/plugin.json interface.defaultPrompt entries must be non-empty strings');
      }
    }
  }

  if (!Array.isArray(interfaceMetadata.screenshots)) {
    fail('.codex-plugin/plugin.json interface.screenshots must be an array (use [] if no screenshots yet)');
  }
};

const assertMarketplaceTemplate = (fail) => {
  const { readJson, readOptionalJson } = createJsonReaders(fail);
  const templatePath = 'packages/kovaa-lab-agent-skills/templates/marketplace.example.json';
  const template = readOptionalJson(templatePath);
  const pluginJson = readJson('packages/kovaa-lab-agent-skills/.codex-plugin/plugin.json');

  if (!template) {
    fail(`marketplace template is missing at ${templatePath}`);
    return;
  }

  if (typeof template.name !== 'string' || template.name.trim().length === 0) {
    fail(`${templatePath} name must be a non-empty string`);
  }

  if (typeof template.interface?.displayName !== 'string' || template.interface.displayName.trim().length === 0) {
    fail(`${templatePath} interface.displayName must be a non-empty string`);
  }

  const entries = template.plugins;

  if (!Array.isArray(entries) || entries.length === 0) {
    fail(`${templatePath} must declare a non-empty plugins array`);
    return;
  }

  const kovaa-labEntry = entries.find((entry) => entry?.name === 'kovaa-lab');

  if (!kovaa-labEntry) {
    fail(`${templatePath} must include a plugin entry named "kovaa-lab"`);
    return;
  }

  if (kovaa-labEntry.source?.source !== 'local') {
    fail(`${templatePath} kovaa-lab.source.source must be local`);
  }

  if (kovaa-labEntry.source?.path !== './packages/kovaa-lab-agent-skills/dist') {
    fail(`${templatePath} kovaa-lab.source.path must be ./packages/kovaa-lab-agent-skills/dist`);
  }

  if (!['NOT_AVAILABLE', 'AVAILABLE', 'INSTALLED_BY_DEFAULT'].includes(kovaa-labEntry.policy?.installation)) {
    fail(`${templatePath} kovaa-lab.policy.installation must be NOT_AVAILABLE, AVAILABLE, or INSTALLED_BY_DEFAULT`);
  }

  if (!['ON_INSTALL', 'ON_USE'].includes(kovaa-labEntry.policy?.authentication)) {
    fail(`${templatePath} kovaa-lab.policy.authentication must be ON_INSTALL or ON_USE`);
  }

  if (kovaa-labEntry.category !== pluginJson?.interface?.category) {
    fail(`${templatePath} kovaa-lab.category must match plugin.json interface.category`);
  }
};

export {
  assertJsonMetadata,
  assertNoBundledMcpConfig,
  assertInterfaceFields,
  assertMarketplaceTemplate,
};
