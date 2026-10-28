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
exports.ConversationService = void 0;
const common_1 = require("@nestjs/common");
const conversation_channel_entity_1 = require("./common/standard-objects/conversation-channel.entity");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
let ConversationService = class ConversationService {
    conversationChannelRepository;
    constructor(conversationChannelRepository) {
        this.conversationChannelRepository = conversationChannelRepository;
    }
    async getConversations() {
        return this.conversationChannelRepository.find();
    }
    async sendOnChannel(messageThreadId, channelType, message) {
        const channel = await this.conversationChannelRepository.findOne({ where: { messageThreadId, channelType } });
        if (channel) {
            // Logic to send message on the channel
        }
    }
    async updateStatus(messageThreadId, channelType, status) {
        await this.conversationChannelRepository.update({ messageThreadId, channelType }, { status });
    }
    async toggleBot(messageThreadId, channelType, isBotEnabled) {
        await this.conversationChannelRepository.update({ messageThreadId, channelType }, { isBotEnabled });
    }
    async setAutoResponseRules(messageThreadId, channelType, autoResponseRules) {
        await this.conversationChannelRepository.update({ messageThreadId, channelType }, { autoResponseRules });
    }
};
exports.ConversationService = ConversationService;
exports.ConversationService = ConversationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(conversation_channel_entity_1.ConversationChannelEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ConversationService);
