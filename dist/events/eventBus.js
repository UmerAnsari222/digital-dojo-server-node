"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const eventBus = new events_1.EventEmitter();
// recommended to increase max listeners
eventBus.setMaxListeners(50);
exports.default = eventBus;
