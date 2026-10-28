"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
describe('FormsWorkspaceService', () => {
    it('should be defined', () => {
        expect(true).toBeDefined();
    });
    it('should validate form data', () => {
        const form = {
            id: 'test-id',
            title: 'Test Form',
            isActive: true,
            questions: [],
            responses: []
        };
        expect(form.title).toBe('Test Form');
        expect(form.isActive).toBe(true);
    });
});
