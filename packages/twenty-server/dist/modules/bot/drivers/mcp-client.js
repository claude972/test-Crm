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
exports.McpClient = void 0;
const common_1 = require("@nestjs/common");
/**
 * MCP HTTP client for communicating with the MCP bot server.
 * Handles tool calls via JSON-RPC 2.0 over HTTP.
 */
let McpClient = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var McpClient = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            McpClient = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        logger = new common_1.Logger(McpClient.name);
        config;
        constructor(config) {
            this.config = config || {
                url: process.env.MCP_BOT_SERVER_URL || 'http://localhost:8080',
                timeout: 30000,
                apiKey: process.env.MCP_BOT_API_KEY,
            };
        }
        /**
         * Call an MCP tool by name with given arguments.
         */
        async callTool(name, args) {
            const url = `${this.config.url}/mcp/call`;
            const payload = {
                jsonrpc: '2.0',
                method: 'tools/call',
                params: {
                    name,
                    arguments: args,
                },
                id: Date.now(),
            };
            this.logger.debug(`Calling MCP tool: ${name}`);
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(this.config.apiKey
                            ? { 'Authorization': `Bearer ${this.config.apiKey}` }
                            : {}),
                    },
                    body: JSON.stringify(payload),
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    this.logger.error(`MCP call failed: ${response.status} - ${errorText}`);
                    throw new Error(`MCP call failed: ${response.status} - ${errorText}`);
                }
                const result = await response.json();
                return result.result;
            }
            catch (error) {
                this.logger.error(`MCP call error for ${name}: ${error}`);
                throw error;
            }
        }
        /**
         * List available tools from the MCP server.
         */
        async listTools() {
            const url = `${this.config.url}/mcp/tools`;
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: this.config.apiKey
                        ? { 'Authorization': `Bearer ${this.config.apiKey}` }
                        : {},
                });
                if (!response.ok) {
                    throw new Error(`Failed to list tools: ${response.status}`);
                }
                const result = await response.json();
                return result.result?.tools ?? [];
            }
            catch (error) {
                this.logger.warn(`Could not list MCP tools: ${error}`);
                return [];
            }
        }
    };
    return McpClient = _classThis;
})();
exports.McpClient = McpClient;
