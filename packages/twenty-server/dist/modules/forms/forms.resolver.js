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
exports.FormsResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const form_workspace_entity_1 = require("./form.workspace-entity");
const form_response_workspace_entity_1 = require("./form-response.workspace-entity");
let FormsResolver = (() => {
    let _classDecorators = [(0, graphql_1.Resolver)(() => form_workspace_entity_1.FormWorkspaceEntity)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _createForm_decorators;
    let _submitResponse_decorators;
    let _listResponses_decorators;
    var FormsResolver = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _createForm_decorators = [(0, graphql_1.Mutation)(() => form_workspace_entity_1.FormWorkspaceEntity)];
            _submitResponse_decorators = [(0, graphql_1.Mutation)(() => form_response_workspace_entity_1.FormResponseWorkspaceEntity)];
            _listResponses_decorators = [(0, graphql_1.Query)(() => [form_response_workspace_entity_1.FormResponseWorkspaceEntity])];
            __esDecorate(this, null, _createForm_decorators, { kind: "method", name: "createForm", static: false, private: false, access: { has: obj => "createForm" in obj, get: obj => obj.createForm }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _submitResponse_decorators, { kind: "method", name: "submitResponse", static: false, private: false, access: { has: obj => "submitResponse" in obj, get: obj => obj.submitResponse }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _listResponses_decorators, { kind: "method", name: "listResponses", static: false, private: false, access: { has: obj => "listResponses" in obj, get: obj => obj.listResponses }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            FormsResolver = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        formsService = __runInitializers(this, _instanceExtraInitializers);
        constructor(formsService) {
            this.formsService = formsService;
        }
        async createForm(data) {
            return this.formsService.createForm(data);
        }
        async submitResponse(data) {
            return this.formsService.submitResponse(data);
        }
        async listResponses(formId, workspaceId) {
            return this.formsService.listResponses(formId, workspaceId);
        }
    };
    return FormsResolver = _classThis;
})();
exports.FormsResolver = FormsResolver;
