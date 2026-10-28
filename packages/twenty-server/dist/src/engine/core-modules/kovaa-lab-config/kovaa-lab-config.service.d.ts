export declare class KovaaLabCRMConfigService {
    get<T = any>(key: string): T | undefined;
    getBoolean(key: string, defaultValue?: boolean): boolean;
    getString(key: string, defaultValue?: string): string;
    getNumber(key: string, defaultValue?: number): number;
}
