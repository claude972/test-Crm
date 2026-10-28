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
exports.MessagingCommonModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const metrics_module_1 = require("src/engine/core-modules/metrics/metrics.module");
const user_workspace_entity_1 = require("src/engine/core-modules/user-workspace/user-workspace.entity");
const connected_account_entity_1 = require("src/engine/metadata-modules/connected-account/entities/connected-account.entity");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const message_folder_entity_1 = require("src/engine/metadata-modules/message-folder/entities/message-folder.entity");
const connected_account_module_1 = require("src/modules/connected-account/connected-account.module");
const message_channel_sync_status_service_1 = require("src/modules/messaging/common/services/message-channel-sync-status.service");
const provide_workspace_scoped_repository_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/provide-workspace-scoped-repository");
let MessagingCommonModule = (() => {
    let _classDecorators = [(0, common_1.Module)({
            imports: [
                typeorm_1.TypeOrmModule.forFeature([
                    message_channel_entity_1.MessageChannelEntity,
                    message_folder_entity_1.MessageFolderEntity,
                    connected_account_entity_1.ConnectedAccountEntity,
                    user_workspace_entity_1.UserWorkspaceEntity,
                ]),
                connected_account_module_1.ConnectedAccountModule,
                metrics_module_1.MetricsModule,
            ],
            providers: [
                message_channel_sync_status_service_1.MessageChannelSyncStatusService,
                (0, provide_workspace_scoped_repository_1.provideWorkspaceScopedRepository)(message_folder_entity_1.MessageFolderEntity),
            ],
            exports: [message_channel_sync_status_service_1.MessageChannelSyncStatusService],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MessagingCommonModule = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessagingCommonModule = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return MessagingCommonModule = _classThis;
})();
exports.MessagingCommonModule = MessagingCommonModule;
