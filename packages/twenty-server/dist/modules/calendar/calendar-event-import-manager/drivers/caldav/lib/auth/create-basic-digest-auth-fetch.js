"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBasicDigestAuthFetch = void 0;
const digest_fetch_1 = __importDefault(require("digest-fetch"));
const tsdav_1 = require("tsdav");
const utils_1 = require("kovaa-lab-shared/utils");
const createBasicDigestAuthFetch = (username, password, baseFetch = globalThis.fetch) => {
    const digestClient = new digest_fetch_1.default(username, password);
    digestClient.getClient = async () => baseFetch;
    const { authorization: basicAuthorization } = (0, tsdav_1.getBasicAuthHeaders)({
        username,
        password,
    });
    return async (input, init) => {
        const headers = new Headers(init?.headers);
        if (!headers.has('Authorization') && (0, utils_1.isDefined)(basicAuthorization)) {
            headers.set('Authorization', basicAuthorization);
        }
        return digestClient.fetch(input, {
            ...init,
            headers,
        });
    };
};
exports.createBasicDigestAuthFetch = createBasicDigestAuthFetch;
