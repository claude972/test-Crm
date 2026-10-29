import { findReservedVariableNamesInApplicationManifest } from 'src/engine/core-modules/application/utils/find-reserved-variable-names-in-application-manifest.util';

describe('findReservedVariableNamesInApplicationManifest', () => {
  it('should return no names when the manifest declares no variables', () => {
    expect(findReservedVariableNamesInApplicationManifest({})).toEqual([]);
  });

  it('should ignore names that are not reserved', () => {
    expect(
      findReservedVariableNamesInApplicationManifest({
        serverVariables: { APP_API_KEY: { isSecret: true } },
        applicationVariables: {
          kovaaLab_api_url: {
            universalIdentifier: 'application-variable-id',
            isSecret: false,
          },
        },
      }),
    ).toEqual([]);
  });

  it('should return reserved names from server and application variables', () => {
    expect(
      findReservedVariableNamesInApplicationManifest({
        serverVariables: {
          APP_API_KEY: { isSecret: true },
          KOVAALAB_API_URL: { isSecret: false },
        },
        applicationVariables: {
          APPLICATION_ID: {
            universalIdentifier: 'application-variable-id',
            isSecret: false,
          },
        },
      }),
    ).toEqual(['KOVAALAB_API_URL', 'APPLICATION_ID']);
  });

  it('should return a name declared in both kinds of variable once', () => {
    expect(
      findReservedVariableNamesInApplicationManifest({
        serverVariables: { KOVAALAB_API_KEY: { isSecret: true } },
        applicationVariables: {
          KOVAALAB_API_KEY: {
            universalIdentifier: 'application-variable-id',
            isSecret: true,
          },
        },
      }),
    ).toEqual(['KOVAALAB_API_KEY']);
  });
});
