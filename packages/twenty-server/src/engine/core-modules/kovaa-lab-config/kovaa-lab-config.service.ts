export class KovaaLabCRMConfigService {
  get<T = any>(key: string): T | undefined {
    return process.env[key] as T;
  }
  getBoolean(key: string, defaultValue = false): boolean {
    const val = this.get<string>(key);
    return val === 'true';
  }
  getString(key: string, defaultValue?: string): string {
    return this.get<string>(key) ?? defaultValue ?? '';
  }
  getNumber(key: string, defaultValue = 0): number {
    return Number(process.env[key]) || defaultValue;
  }
}
