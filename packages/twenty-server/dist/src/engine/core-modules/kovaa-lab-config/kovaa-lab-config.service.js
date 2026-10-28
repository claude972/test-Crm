"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KovaaLabCRMConfigService = void 0;
class KovaaLabCRMConfigService {
    get(key) {
        return process.env[key];
    }
    getBoolean(key, defaultValue = false) {
        const val = this.get(key);
        return val === 'true';
    }
    getString(key, defaultValue) {
        return this.get(key) ?? defaultValue ?? '';
    }
    getNumber(key, defaultValue = 0) {
        return Number(process.env[key]) || defaultValue;
    }
}
exports.KovaaLabCRMConfigService = KovaaLabCRMConfigService;
