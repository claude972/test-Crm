"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModulesModule = void 0;
const common_1 = require("@nestjs/common");
const messaging_module_1 = require("src/modules/messaging/messaging.module");
const calendar_module_1 = require("src/modules/calendar/calendar.module");
const bot_module_1 = require("src/modules/bot/bot.module");
const forms_module_1 = require("src/modules/forms/forms.module");
let ModulesModule = class ModulesModule {
};
exports.ModulesModule = ModulesModule;
exports.ModulesModule = ModulesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            messaging_module_1.MessagingModule,
            calendar_module_1.CalendarModule,
            bot_module_1.BotModule,
            forms_module_1.FormsModule,
        ],
    })
], ModulesModule);
