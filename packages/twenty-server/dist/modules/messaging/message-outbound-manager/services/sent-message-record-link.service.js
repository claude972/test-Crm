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
exports.SentMessageRecordLinkService = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("kovaa-lab-shared/utils");
const get_target_field_name_for_object_record_util_1 = require("src/engine/core-modules/target/utils/get-target-field-name-for-object-record.util");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
let SentMessageRecordLinkService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var SentMessageRecordLinkService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            SentMessageRecordLinkService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        workspaceOrmManager;
        recordPermissionsService;
        constructor(workspaceOrmManager, recordPermissionsService) {
            this.workspaceOrmManager = workspaceOrmManager;
            this.recordPermissionsService = recordPermissionsService;
        }
        async linkSentMessageThreadToRecord({ authContext, messageThreadId, objectNameSingular, recordId, }) {
            const targetFieldName = (0, get_target_field_name_for_object_record_util_1.getTargetFieldNameForObjectRecord)(objectNameSingular);
            if (!(0, utils_1.isDefined)(targetFieldName)) {
                return;
            }
            // The link is written in a system context, so the caller's own access to this record, row-level rules included, gates it
            const permissionsByRecordId = await this.recordPermissionsService.getPermissionsForRecords({
                authContext,
                flatObjectMetadata: { nameSingular: objectNameSingular },
                recordIds: [recordId],
            });
            if (!permissionsByRecordId.get(recordId)?.canUpdate) {
                return;
            }
            await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                const messageThreadTargetRepository = this.workspaceOrmManager.getRepository('messageThreadTarget', { shouldBypassPermissionChecks: true });
                const existingMessageThreadTarget = await messageThreadTargetRepository.findOne({
                    where: { messageThreadId, [targetFieldName]: recordId },
                });
                if ((0, utils_1.isDefined)(existingMessageThreadTarget)) {
                    if (!existingMessageThreadTarget.isManuallyAssigned) {
                        await messageThreadTargetRepository.update(existingMessageThreadTarget.id, { isManuallyAssigned: true });
                    }
                    return;
                }
                await messageThreadTargetRepository.insert({
                    messageThreadId,
                    [targetFieldName]: recordId,
                    isAutomaticallyAssigned: false,
                    isManuallyAssigned: true,
                });
            }, (0, build_system_auth_context_util_1.buildSystemAuthContext)(authContext.workspace.id));
        }
    };
    return SentMessageRecordLinkService = _classThis;
})();
exports.SentMessageRecordLinkService = SentMessageRecordLinkService;
