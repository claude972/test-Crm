"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const conversation_channel_entity_1 = require("./common/standard-objects/conversation-channel.entity");
let ConversationResolver = (() => {
    let _classDecorators = [(0, graphql_1.Resolver)(() => conversation_channel_entity_1.ConversationChannelEntity)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _getConversations_decorators;
    let _sendOnChannel_decorators;
    let _updateStatus_decorators;
    let _toggleBot_decorators;
    let _setAutoResponseRules_decorators;
    var ConversationResolver = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _getConversations_decorators = [(0, graphql_1.Query)(() => [conversation_channel_entity_1.ConversationChannelEntity])];
            _sendOnChannel_decorators = [(0, graphql_1.Mutation)(() => conversation_channel_entity_1.ConversationChannelEntity)];
            _updateStatus_decorators = [(0, graphql_1.Mutation)(() => conversation_channel_entity_1.ConversationChannelEntity)];
            _toggleBot_decorators = [(0, graphql_1.Mutation)(() => conversation_channel_entity_1.ConversationChannelEntity)];
            _setAutoResponseRules_decorators = [(0, graphql_1.Mutation)(() => conversation_channel_entity_1.ConversationChannelEntity)];
            __esDecorate(this, null, _getConversations_decorators, { kind: "method", name: "getConversations", static: false, private: false, access: { has: obj => "getConversations" in obj, get: obj => obj.getConversations }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _sendOnChannel_decorators, { kind: "method", name: "sendOnChannel", static: false, private: false, access: { has: obj => "sendOnChannel" in obj, get: obj => obj.sendOnChannel }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _updateStatus_decorators, { kind: "method", name: "updateStatus", static: false, private: false, access: { has: obj => "updateStatus" in obj, get: obj => obj.updateStatus }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _toggleBot_decorators, { kind: "method", name: "toggleBot", static: false, private: false, access: { has: obj => "toggleBot" in obj, get: obj => obj.toggleBot }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _setAutoResponseRules_decorators, { kind: "method", name: "setAutoResponseRules", static: false, private: false, access: { has: obj => "setAutoResponseRules" in obj, get: obj => obj.setAutoResponseRules }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ConversationResolver = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        conversationService = __runInitializers(this, _instanceExtraInitializers);
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
    return ConversationResolver = _classThis;
})();
exports.ConversationResolver = ConversationResolver;
