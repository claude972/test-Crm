import { type ConfigVariables } from 'src/engine/core-modules/kovaa-lab-config/config-variables';

export type ConfigKey = keyof ConfigVariables;
export type ConfigValue<T extends ConfigKey> = ConfigVariables[T];

export interface ConfigCacheEntry<T extends ConfigKey> {
  value: ConfigValue<T>;
}
