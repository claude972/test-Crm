"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InboundEmailS3ClientProvider = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const guards_1 = require("@sniptt/guards");
const kovaa_lab_config_service_1 = require("src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service");
const aws_request_handler_util_1 = require("src/utils/aws-request-handler.util");
let InboundEmailS3ClientProvider = class InboundEmailS3ClientProvider {
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
exports.InboundEmailS3ClientProvider = InboundEmailS3ClientProvider;
exports.InboundEmailS3ClientProvider = InboundEmailS3ClientProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [kovaa_lab_config_service_1.KovaaLabCRMConfigService])
], InboundEmailS3ClientProvider);
