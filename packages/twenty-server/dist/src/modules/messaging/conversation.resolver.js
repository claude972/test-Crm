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
exports.ConversationResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const conversation_service_1 = require("./conversation.service");
const conversation_channel_entity_1 = require("./common/standard-objects/conversation-channel.entity");
let ConversationResolver = class ConversationResolver {
    conversationService;
    constructor(conversationService) {
        this.conversationService = conversationService;
    }
    async getConversations() {
        return this.conversationService.getConversations();
    }
    async sendOnChannel(messageThreadId, channelType, message) {
        return this.conversationService.sendOnChannel(messageThreadId, channelType, message);
    }
    async updateStatus(messageThreadId, channelType, status) {
        return this.conversationService.updateStatus(messageThreadId, channelType, status);
    }
    async toggleBot(messageThreadId, channelType, isBotEnabled) {
        return this.conversationService.toggleBot(messageThreadId, channelType, isBotEnabled);
    }
    async setAutoResponseRules(messageThreadId, channelType, autoResponseRules) {
        return this.conversationService.setAutoResponseRules(messageThreadId, channelType, autoResponseRules);
    }
};
exports.ConversationResolver = ConversationResolver;
__decorate([
    (0, graphql_1.Query)(() => [conversation_channel_entity_1.ConversationChannelEntity]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ConversationResolver.prototype, "getConversations", null);
__decorate([
    (0, graphql_1.Mutation)(() => conversation_channel_entity_1.ConversationChannelEntity),
    __param(0, (0, graphql_1.Args)('messageThreadId')),
    __param(1, (0, graphql_1.Args)('channelType')),
    __param(2, (0, graphql_1.Args)('message')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ConversationResolver.prototype, "sendOnChannel", null);
__decorate([
    (0, graphql_1.Mutation)(() => conversation_channel_entity_1.ConversationChannelEntity),
    __param(0, (0, graphql_1.Args)('messageThreadId')),
    __param(1, (0, graphql_1.Args)('channelType')),
    __param(2, (0, graphql_1.Args)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ConversationResolver.prototype, "updateStatus", null);
__decorate([
    (0, graphql_1.Mutation)(() => conversation_channel_entity_1.ConversationChannelEntity),
    __param(0, (0, graphql_1.Args)('messageThreadId')),
    __param(1, (0, graphql_1.Args)('channelType')),
    __param(2, (0, graphql_1.Args)('isBotEnabled')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Boolean]),
    __metadata("design:returntype", Promise)
], ConversationResolver.prototype, "toggleBot", null);
__decorate([
    (0, graphql_1.Mutation)(() => conversation_channel_entity_1.ConversationChannelEntity),
    __param(0, (0, graphql_1.Args)('messageThreadId')),
    __param(1, (0, graphql_1.Args)('channelType')),
    __param(2, (0, graphql_1.Args)('autoResponseRules')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ConversationResolver.prototype, "setAutoResponseRules", null);
exports.ConversationResolver = ConversationResolver = __decorate([
    (0, graphql_1.Resolver)(() => conversation_channel_entity_1.ConversationChannelEntity),
    __metadata("design:paramtypes", [conversation_service_1.ConversationService])
], ConversationResolver);
