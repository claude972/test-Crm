import { buildHostFetchPolicyFromFrontComponentUrls } from '../buildHostFetchPolicyFromFrontComponentUrls';

describe('buildHostFetchPolicyFromFrontComponentUrls', () => {
  it('should derive allowed origins from the api, functions and component urls', () => {
    const hostFetchPolicy = buildHostFetchPolicyFromFrontComponentUrls({
      componentUrl:
        'https://components.kovaa-lab.test/rest/front-components/component-id',
      apiUrl: 'https://api.kovaa-lab.test/graphql',
      functionsBaseUrl: 'https://functions.kovaa-lab.test/base',
    });

    expect(hostFetchPolicy.allowedOrigins).toEqual([
      'https://api.kovaa-lab.test',
      'https://functions.kovaa-lab.test',
      'https://components.kovaa-lab.test',
    ]);
  });

  it('should drop undefined urls', () => {
    const hostFetchPolicy = buildHostFetchPolicyFromFrontComponentUrls({
      componentUrl: 'https://api.kovaa-lab.test/rest/front-components/id',
    });

    expect(hostFetchPolicy.allowedOrigins).toEqual(['https://api.kovaa-lab.test']);
  });

  it('should drop malformed urls', () => {
    const hostFetchPolicy = buildHostFetchPolicyFromFrontComponentUrls({
      componentUrl: 'https://api.kovaa-lab.test/rest/front-components/id',
      apiUrl: 'not a url',
    });

    expect(hostFetchPolicy.allowedOrigins).toEqual(['https://api.kovaa-lab.test']);
  });

  it('should drop urls with non http schemes', () => {
    const hostFetchPolicy = buildHostFetchPolicyFromFrontComponentUrls({
      componentUrl: 'https://api.kovaa-lab.test/rest/front-components/id',
      apiUrl: 'data:text/html,<script>alert(1)</script>',
      functionsBaseUrl: 'file:///etc/passwd',
    });

    expect(hostFetchPolicy.allowedOrigins).toEqual(['https://api.kovaa-lab.test']);
  });

  it('should deduplicate identical origins', () => {
    const hostFetchPolicy = buildHostFetchPolicyFromFrontComponentUrls({
      componentUrl: 'https://api.kovaa-lab.test/rest/front-components/id',
      apiUrl: 'https://api.kovaa-lab.test/graphql',
      functionsBaseUrl: 'https://api.kovaa-lab.test/functions',
    });

    expect(hostFetchPolicy.allowedOrigins).toEqual(['https://api.kovaa-lab.test']);
  });

  it('should mark the component and sdk client urls as file storage redirectable', () => {
    const hostFetchPolicy = buildHostFetchPolicyFromFrontComponentUrls({
      componentUrl: 'https://api.kovaa-lab.test/rest/front-components/id',
      sdkClientUrls: {
        core: 'https://api.kovaa-lab.test/sdk-client/application-id/core',
        metadata: 'https://api.kovaa-lab.test/sdk-client/application-id/metadata',
      },
    });

    expect(hostFetchPolicy.fileStorageRedirectableUrls).toEqual([
      'https://api.kovaa-lab.test/rest/front-components/id',
      'https://api.kovaa-lab.test/sdk-client/application-id/core',
      'https://api.kovaa-lab.test/sdk-client/application-id/metadata',
    ]);
  });

  it('should mark only the component url as redirectable when sdk client urls are undefined', () => {
    const hostFetchPolicy = buildHostFetchPolicyFromFrontComponentUrls({
      componentUrl: 'https://api.kovaa-lab.test/rest/front-components/id',
    });

    expect(hostFetchPolicy.fileStorageRedirectableUrls).toEqual([
      'https://api.kovaa-lab.test/rest/front-components/id',
    ]);
  });
});
