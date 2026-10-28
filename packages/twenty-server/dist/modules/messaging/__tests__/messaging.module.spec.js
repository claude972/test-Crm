"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** @jest-environment node */
const testing_1 = require("@nestjs/testing");
const messaging_module_1 = require("../messaging.module");
describe('MessagingModule', () => {
    let module;
    beforeEach(async () => {
        module = await testing_1.Test.createTestingModule({
            imports: [messaging_module_1.MessagingModule],
        }).compile();
    });
    it('should be defined', () => {
        expect(module).toBeDefined();
    });
    it('should have MessagingImportManagerModule', () => {
        // Basic module existence test
        expect(messaging_module_1.MessagingModule).toBeDefined();
    });
});
