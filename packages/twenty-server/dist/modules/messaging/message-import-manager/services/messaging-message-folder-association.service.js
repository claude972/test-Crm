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
exports.MessagingMessageFolderAssociationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const build_message_folder_associations_to_insert_util_1 = require("src/modules/messaging/message-import-manager/utils/build-message-folder-associations-to-insert.util");
let MessagingMessageFolderAssociationService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MessagingMessageFolderAssociationService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessagingMessageFolderAssociationService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        workspaceOrmManager;
        constructor(workspaceOrmManager) {
            this.workspaceOrmManager = workspaceOrmManager;
        }
        async saveMessageFolderAssociations(associations, workspaceId, transactionScope) {
            const associationIds = [
                ...new Set(associations
                    .filter((association) => association.messageFolderIds.length > 0)
                    .map((association) => association.messageChannelMessageAssociationId)),
            ];
            if (associationIds.length === 0) {
                return;
            }
            const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
            await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                const repository = transactionScope.getRepository('messageChannelMessageAssociationMessageFolder', { shouldBypassPermissionChecks: true });
                const existingRecords = await repository.find({
                    where: {
                        messageChannelMessageAssociationId: (0, typeorm_1.In)(associationIds),
                    },
                });
                const recordsToInsert = (0, build_message_folder_associations_to_insert_util_1.buildMessageFolderAssociationsToInsert)({
                    associations,
                    existingRecords,
                });
                if (recordsToInsert.length > 0) {
                    await repository.insert(recordsToInsert);
                }
            }, authContext, { lite: true });
        }
    };
    return MessagingMessageFolderAssociationService = _classThis;
})();
exports.MessagingMessageFolderAssociationService = MessagingMessageFolderAssociationService;
