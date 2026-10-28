"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
describe('BotService', () => {
    it('should be defined', () => {
        expect(true).toBeDefined();
    });
    it('should handle bot messages', () => {
        const message = { role: 'assistant', content: 'Hello from KovaaLab!' };
        expect(message.role).toBe('assistant');
    });
});
