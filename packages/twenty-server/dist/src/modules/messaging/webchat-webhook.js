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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebchatWebhookController = exports.WebchatWebhookDriver = void 0;
const common_1 = require("@nestjs/common");
const conversation_service_1 = require("./conversation.service");
let WebchatWebhookDriver = class WebchatWebhookDriver {
};
exports.WebchatWebhookDriver = WebchatWebhookDriver;
exports.WebchatWebhookDriver = WebchatWebhookDriver = __decorate([
    (0, common_1.Injectable)()
], WebchatWebhookDriver);
let WebchatWebhookController = class WebchatWebhookController {
    conversationService;
    constructor(conversationService) {
        this.conversationService = conversationService;
    }
    async inbound(externalChannelId, body) {
        return { externalChannelId, received: body, at: new Date().toISOString() };
    }
};
exports.WebchatWebhookController = WebchatWebhookController;
__decorate([
    (0, common_1.Post)('inbound'),
    __param(0, (0, common_1.Param)('externalChannelId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WebchatWebhookController.prototype, "inbound", null);
exports.WebchatWebhookController = WebchatWebhookController = __decorate([
    (0, common_1.Controller)('webhooks/messaging/webchat'),
    __metadata("design:paramtypes", [conversation_service_1.ConversationService])
], WebchatWebhookController);
