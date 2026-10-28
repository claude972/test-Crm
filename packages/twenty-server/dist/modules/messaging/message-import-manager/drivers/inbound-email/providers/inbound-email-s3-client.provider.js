"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InboundEmailS3ClientProvider = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const guards_1 = require("@sniptt/guards");
const aws_request_handler_util_1 = require("src/utils/aws-request-handler.util");
let InboundEmailS3ClientProvider = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var InboundEmailS3ClientProvider = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            InboundEmailS3ClientProvider = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        kovaaLabConfigService;
        s3Client = null;
        constructor(kovaaLabConfigService) {
            this.kovaaLabConfigService = kovaaLabConfigService;
        }
        getBucket() {
            const bucket = this.kovaaLabConfigService.get('STORAGE_S3_NAME');
            if (!(0, guards_1.isNonEmptyString)(bucket)) {
                throw new Error('STORAGE_S3_NAME is not configured; email group requires S3 storage.');
            }
            return bucket;
        }
        getClient() {
            if (this.s3Client) {
                return this.s3Client;
            }
            const region = this.kovaaLabConfigService.get('STORAGE_S3_REGION');
            if (!(0, guards_1.isNonEmptyString)(region)) {
                throw new Error('STORAGE_S3_REGION must be set to use email group.');
            }
            const config = {
                region,
                requestHandler: (0, aws_request_handler_util_1.buildAwsRequestHandlerOptions)(),
            };
            const endpoint = this.kovaaLabConfigService.get('STORAGE_S3_ENDPOINT');
            if ((0, guards_1.isNonEmptyString)(endpoint)) {
                config.endpoint = endpoint;
            }
            const accessKeyId = this.kovaaLabConfigService.get('STORAGE_S3_ACCESS_KEY_ID');
            const secretAccessKey = this.kovaaLabConfigService.get('STORAGE_S3_SECRET_ACCESS_KEY');
            if ((0, guards_1.isNonEmptyString)(accessKeyId) && (0, guards_1.isNonEmptyString)(secretAccessKey)) {
                config.credentials = { accessKeyId, secretAccessKey };
            }
            this.s3Client = new client_s3_1.S3Client(config);
            return this.s3Client;
        }
    };
    return InboundEmailS3ClientProvider = _classThis;
})();
exports.InboundEmailS3ClientProvider = InboundEmailS3ClientProvider;
