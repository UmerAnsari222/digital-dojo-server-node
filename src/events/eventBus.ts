import { EventEmitter } from "events";

const eventBus = new EventEmitter();

// recommended to increase max listeners
eventBus.setMaxListeners(50);

export default eventBus;
