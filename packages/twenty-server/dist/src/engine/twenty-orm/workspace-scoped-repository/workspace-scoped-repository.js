"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceScopedRepository = void 0;
exports.provideWorkspaceScopedRepository = provideWorkspaceScopedRepository;
class WorkspaceScopedRepository {
    create(input) { return Promise.resolve(input); }
    find(criteria) { return Promise.resolve([]); }
    update(id, input) { return Promise.resolve(null); }
    remove(id) { return Promise.resolve(); }
}
exports.WorkspaceScopedRepository = WorkspaceScopedRepository;
function provideWorkspaceScopedRepository(repoClass) {
    return { provide: repoClass, useClass: repoClass };
}
