import {
  getFunctionsBaseUrl,
  getLogicFunctionHttpUrl,
} from '@/logic-functions/utils/getLogicFunctionHttpUrl';

describe('getFunctionsBaseUrl', () => {
  it('builds the isolated base from subdomain + public domain', () => {
    expect(
      getFunctionsBaseUrl({
        serverBaseUrl: 'https://api.kovaa-lab.com',
        publicFunctionDomain: 'withkovaa-lab.com',
        workspaceSubdomain: 'acme',
      }),
    ).toBe('https://acme.withkovaa-lab.com');
  });

  it('falls back to the /s server route when the public domain is missing', () => {
    expect(
      getFunctionsBaseUrl({
        serverBaseUrl: 'https://api.kovaa-lab.com',
        publicFunctionDomain: null,
        workspaceSubdomain: 'acme',
      }),
    ).toBe('https://api.kovaa-lab.com/s');
  });

  it('falls back to the /s server route when the subdomain is missing', () => {
    expect(
      getFunctionsBaseUrl({
        serverBaseUrl: 'https://api.kovaa-lab.com',
        publicFunctionDomain: 'withkovaa-lab.com',
        workspaceSubdomain: undefined,
      }),
    ).toBe('https://api.kovaa-lab.com/s');
  });
});

describe('getLogicFunctionHttpUrl', () => {
  it('builds the isolated public-domain URL when configured', () => {
    expect(
      getLogicFunctionHttpUrl({
        path: '/webhook/stripe',
        serverBaseUrl: 'https://api.kovaa-lab.com',
        publicFunctionDomain: 'withkovaa-lab.com',
        workspaceSubdomain: 'acme',
      }),
    ).toBe('https://acme.withkovaa-lab.com/webhook/stripe');
  });

  it('normalizes a path that does not start with a slash', () => {
    expect(
      getLogicFunctionHttpUrl({
        path: 'webhook',
        serverBaseUrl: 'https://api.kovaa-lab.com',
        publicFunctionDomain: 'withkovaa-lab.com',
        workspaceSubdomain: 'acme',
      }),
    ).toBe('https://acme.withkovaa-lab.com/webhook');
  });

  it('falls back to the legacy /s/ route when no public domain is configured', () => {
    expect(
      getLogicFunctionHttpUrl({
        path: '/webhook/stripe',
        serverBaseUrl: 'https://api.kovaa-lab.com',
        publicFunctionDomain: null,
        workspaceSubdomain: 'acme',
      }),
    ).toBe('https://api.kovaa-lab.com/s/webhook/stripe');
  });

  it('falls back to the legacy /s/ route when the workspace has no subdomain', () => {
    expect(
      getLogicFunctionHttpUrl({
        path: '/webhook',
        serverBaseUrl: 'https://api.kovaa-lab.com',
        publicFunctionDomain: 'withkovaa-lab.com',
        workspaceSubdomain: undefined,
      }),
    ).toBe('https://api.kovaa-lab.com/s/webhook');
  });
});
