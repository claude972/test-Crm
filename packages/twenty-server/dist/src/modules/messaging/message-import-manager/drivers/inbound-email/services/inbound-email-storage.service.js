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
exports.InboundEmailStorageService = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const inbound_email_s3_client_provider_1 = require("src/modules/messaging/message-import-manager/drivers/inbound-email/providers/inbound-email-s3-client.provider");
const utils_1 = require("kovaa-lab-shared/utils");
let InboundEmailStorageService = class InboundEmailStorageService {
    inboundEmailS3ClientProvider;
    constructor(inboundEmailS3ClientProvider) {
        this.inboundEmailS3ClientProvider = inboundEmailS3ClientProvider;
    }
    async getRawMessage(s3Key) {
        const client = this.inboundEmailS3ClientProvider.getClient();
        const bucket = this.inboundEmailS3ClientProvider.getBucket();
        const response = await client.send(new client_s3_1.GetObjectCommand({ Bucket: bucket, Key: s3Key }));
        if (!(0, utils_1.isDefined)(response.Body)) {
            throw new Error(`S3 object ${s3Key} has no body`);
        }
        const stream = response.Body;
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    }
    async deleteRawMessage(s3Key) {
        const client = this.inboundEmailS3ClientProvider.getClient();
        const bucket = this.inboundEmailS3ClientProvider.getBucket();
        await client.send(new client_s3_1.DeleteObjectCommand({ Bucket: bucket, Key: s3Key }));
    }
};
exports.InboundEmailStorageService = InboundEmailStorageService;
exports.InboundEmailStorageService = InboundEmailStorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [inbound_email_s3_client_provider_1.InboundEmailS3ClientProvider])
], InboundEmailStorageService);
