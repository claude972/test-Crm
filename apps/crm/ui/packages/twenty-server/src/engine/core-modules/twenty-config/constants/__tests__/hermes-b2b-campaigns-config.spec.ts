import { ConfigVariables } from 'src/engine/core-modules/twenty-config/config-variables';
import { type ConfigVariablesMetadataMap } from 'src/engine/core-modules/twenty-config/decorators/config-variables-metadata.decorator';
import { ConfigVariableType } from 'src/engine/core-modules/twenty-config/enums/config-variable-type.enum';
import { TypedReflect } from 'src/utils/typed-reflect';

describe('campaign drafts operator configuration', () => {
  it('is disabled by default', () => {
    expect(new ConfigVariables().HERMES_B2B_CAMPAIGNS_ENABLED).toBe(false);
  });
  it('is a server environment-only boolean', () => {
    const metadata: ConfigVariablesMetadataMap =
      TypedReflect.getMetadata('config-variables', ConfigVariables) ?? {};
    expect(metadata.HERMES_B2B_CAMPAIGNS_ENABLED).toMatchObject({
      type: ConfigVariableType.BOOLEAN,
      isEnvOnly: true,
    });
  });
});
