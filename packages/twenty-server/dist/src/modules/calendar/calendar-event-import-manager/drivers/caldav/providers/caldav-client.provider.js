"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalDavClientProvider = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_2 = require("typeorm");
const connected_account_entity_1 = require("src/engine/metadata-modules/connected-account/entities/connected-account.entity");
const connected_account_token_encryption_service_1 = require("src/engine/metadata-modules/connected-account/services/connected-account-token-encryption.service");
const calendar_event_import_driver_exception_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/exceptions/calendar-event-import-driver.exception");
const caldav_client_service_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/services/caldav-client.service");
let CalDavClientProvider = class CalDavClientProvider {
    calDavClientService;
    connectedAccountTokenEncryptionService;
    connectedAccountRepository;
    constructor(calDavClientService, connectedAccountTokenEncryptionService, connectedAccountRepository) {
        this.calDavClientService = calDavClientService;
        this.connectedAccountTokenEncryptionService = connectedAccountTokenEncryptionService;
        this.connectedAccountRepository = connectedAccountRepository;
    }
    async getClient(connectedAccountId) {
        const connectedAccount = await this.connectedAccountRepository.findOne({
            where: { id: connectedAccountId },
        });
        if (!(0, utils_1.isDefined)(connectedAccount) ||
            connectedAccount.provider !== types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV ||
            !(0, utils_1.isDefined)(connectedAccount.connectionParameters?.CALDAV)) {
            throw new calendar_event_import_driver_exception_1.CalendarEventImportDriverException(`Missing CalDAV credentials for connected account ${connectedAccountId}`, calendar_event_import_driver_exception_1.CalendarEventImportDriverExceptionCode.INSUFFICIENT_PERMISSIONS);
        }
        const params = this.connectedAccountTokenEncryptionService.decryptProtocolPassword({
            protocolParams: connectedAccount.connectionParameters.CALDAV,
            workspaceId: connectedAccount.workspaceId,
        });
        return this.calDavClientService.getClient({
            serverUrl: params.host,
            username: params.username ?? connectedAccount.handle,
            password: params.password,
        });
    }
};
exports.CalDavClientProvider = CalDavClientProvider;
exports.CalDavClientProvider = CalDavClientProvider = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(connected_account_entity_1.ConnectedAccountEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof caldav_client_service_1.CalDavClientService !== "undefined" && caldav_client_service_1.CalDavClientService) === "function" ? _a : Object, connected_account_token_encryption_service_1.ConnectedAccountTokenEncryptionService,
        typeorm_2.Repository])
], CalDavClientProvider);
