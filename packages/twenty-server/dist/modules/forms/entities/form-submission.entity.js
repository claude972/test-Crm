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
exports.FormSubmissionEntity = void 0;
// Form Submission Entity
const typeorm_1 = require("typeorm");
let FormSubmissionEntity = (() => {
    let _classDecorators = [(0, typeorm_1.Entity)('form_submissions')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _formId_decorators;
    let _formId_initializers = [];
    let _formId_extraInitializers = [];
    let _data_decorators;
    let _data_initializers = [];
    let _data_extraInitializers = [];
    let _submitterId_decorators;
    let _submitterId_initializers = [];
    let _submitterId_extraInitializers = [];
    let _submitterEmail_decorators;
    let _submitterEmail_initializers = [];
    let _submitterEmail_extraInitializers = [];
    let _status_decorators;
    let _status_initializers = [];
    let _status_extraInitializers = [];
    let _submittedAt_decorators;
    let _submittedAt_initializers = [];
    let _submittedAt_extraInitializers = [];
    var FormSubmissionEntity = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)('uuid')];
            _formId_decorators = [(0, typeorm_1.Column)()];
            _data_decorators = [(0, typeorm_1.Column)({ type: 'jsonb' })];
            _submitterId_decorators = [(0, typeorm_1.Column)({ nullable: true })];
            _submitterEmail_decorators = [(0, typeorm_1.Column)({ nullable: true })];
            _status_decorators = [(0, typeorm_1.Column)({ default: 'completed' })];
            _submittedAt_decorators = [(0, typeorm_1.CreateDateColumn)()];
            __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
            __esDecorate(null, null, _formId_decorators, { kind: "field", name: "formId", static: false, private: false, access: { has: obj => "formId" in obj, get: obj => obj.formId, set: (obj, value) => { obj.formId = value; } }, metadata: _metadata }, _formId_initializers, _formId_extraInitializers);
            __esDecorate(null, null, _data_decorators, { kind: "field", name: "data", static: false, private: false, access: { has: obj => "data" in obj, get: obj => obj.data, set: (obj, value) => { obj.data = value; } }, metadata: _metadata }, _data_initializers, _data_extraInitializers);
            __esDecorate(null, null, _submitterId_decorators, { kind: "field", name: "submitterId", static: false, private: false, access: { has: obj => "submitterId" in obj, get: obj => obj.submitterId, set: (obj, value) => { obj.submitterId = value; } }, metadata: _metadata }, _submitterId_initializers, _submitterId_extraInitializers);
            __esDecorate(null, null, _submitterEmail_decorators, { kind: "field", name: "submitterEmail", static: false, private: false, access: { has: obj => "submitterEmail" in obj, get: obj => obj.submitterEmail, set: (obj, value) => { obj.submitterEmail = value; } }, metadata: _metadata }, _submitterEmail_initializers, _submitterEmail_extraInitializers);
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: obj => "status" in obj, get: obj => obj.status, set: (obj, value) => { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            __esDecorate(null, null, _submittedAt_decorators, { kind: "field", name: "submittedAt", static: false, private: false, access: { has: obj => "submittedAt" in obj, get: obj => obj.submittedAt, set: (obj, value) => { obj.submittedAt = value; } }, metadata: _metadata }, _submittedAt_initializers, _submittedAt_extraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            FormSubmissionEntity = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        id = __runInitializers(this, _id_initializers, void 0);
        formId = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _formId_initializers, void 0));
        data = (__runInitializers(this, _formId_extraInitializers), __runInitializers(this, _data_initializers, void 0));
        submitterId = (__runInitializers(this, _data_extraInitializers), __runInitializers(this, _submitterId_initializers, void 0));
        submitterEmail = (__runInitializers(this, _submitterId_extraInitializers), __runInitializers(this, _submitterEmail_initializers, void 0));
        status = (__runInitializers(this, _submitterEmail_extraInitializers), __runInitializers(this, _status_initializers, void 0));
        submittedAt = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _submittedAt_initializers, void 0));
        constructor() {
            __runInitializers(this, _submittedAt_extraInitializers);
        }
    };
    return FormSubmissionEntity = _classThis;
})();
exports.FormSubmissionEntity = FormSubmissionEntity;
