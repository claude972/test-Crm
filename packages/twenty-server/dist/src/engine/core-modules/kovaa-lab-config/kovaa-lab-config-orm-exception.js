"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KovaaLabCRMOrmException = exports.KovaaLabCRMOrmExceptionCode = void 0;
var KovaaLabCRMOrmExceptionCode;
(function (KovaaLabCRMOrmExceptionCode) {
    KovaaLabCRMOrmExceptionCode["QUERY_READ_TIMEOUT"] = "QUERY_READ_TIMEOUT";
    KovaaLabCRMOrmExceptionCode["TRANSIENT_DATABASE_ERROR"] = "TRANSIENT_DATABASE_ERROR";
    KovaaLabCRMOrmExceptionCode["DUPLICATE_ENTRY"] = "DUPLICATE_ENTRY";
    KovaaLabCRMOrmExceptionCode["FOREIGN_KEY_CONSTRAINT"] = "FOREIGN_KEY_CONSTRAINT";
    KovaaLabCRMOrmExceptionCode["UNIQUE_CONSTRAINT"] = "UNIQUE_CONSTRAINT";
})(KovaaLabCRMOrmExceptionCode || (exports.KovaaLabCRMOrmExceptionCode = KovaaLabCRMOrmExceptionCode = {}));
class KovaaLabCRMOrmException extends Error {
    code;
    constructor(code, message) {
        super(message || code);
        this.code = code;
    }
}
exports.KovaaLabCRMOrmException = KovaaLabCRMOrmException;
