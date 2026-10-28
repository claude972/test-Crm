"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestingModule = exports.Test = void 0;
exports.Test = {
    createTestingModule: () => ({
        imports: () => ({
            imports: () => ({
                providers: () => ({
                    compile: () => Promise.resolve({})
                })
            })
        })
    })
};
const TestingModule = class {
};
exports.TestingModule = TestingModule;
