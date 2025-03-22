/// <reference types="../CTAutocomplete" />
import WebSocket from '../WebSocket';
class SBOSocket {
    constructor() {
        const protocol = "wss://";
        const hostname = "api.skyblockoverhaul.com"
        const path = "/sbo-ws";
        this.url = `${protocol}${hostname}${path}`;
        
        this.reconnectInterval = 120000;
        this.reconnectTimeout = null;
        this.connected = false;

        this.eventListeners = {
            error: [],
            open: [],
            close: []
        };

        this.initializeSocket();
    }

    initializeSocket() {
        this.ws = new WebSocket(this.url);

        this.ws.onMessage = (msg) => {
            const data = JSON.parse(msg);
            if (data.type && this.eventListeners[data.type]) {
                this.emit(data.type, data);
            }
        };
        this.ws.onError = (err) => {
            this.logError("Error:", err);
            this.emit('error', err);
            this.scheduleReconnect();
        };
        this.ws.onOpen = () => {
            this.chatLog("Socket connected", "&a");
            this.connected = true;
            this.emit('open');
            if (this.reconnectTimeout) {
                this.reconnectTimeout = null;
            }
        };
        this.ws.onClose = () => {
            this.chatLog("Socket closed", "&c");
            this.connected = false;
            this.emit('close');
            this.scheduleReconnect();
        };
    }

    connect() {
        this.ws.connect();
    }

    send(type, data) {
        if (this.connected) {
            this.ws.send(JSON.stringify({
                type: type,
                data: data
            }));
        } else {
            this.logWarn("Socket not connected, message not sent");
        }
    } 

    addEvent(event) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
    }

    on(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(callback);
        } else {
            this.logWarn(`Unknown event: ${event}`);
        }
    }

    emit(event, ...args) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach((callback) => {
                try {
                    callback(...args);
                } catch (e) {
                    this.logError(`Error in ${event} listener:`, e);
                }
            });
        }
    }

    scheduleReconnect() {
        if (this.reconnectTimeout) return;
        
        this.chatLog(`Reconnecting in ${this.reconnectInterval / 1000} seconds...`, "&e");
        this.reconnectTimeout = setTimeout(() => {
            this.chatLog("Reconnecting Socket...", "&e");
            this.initializeSocket();
            this.connect();
        }, this.reconnectInterval);
    }

    chatLog(message, cCode = "&7") {
        ChatLib.chat("&6[SBO] " + cCode + message);
    }   

    log(...messages) {
        console.log("[SBO]", ...messages);
    }

    logError(...messages) {
        console.error("[SBO]", ...messages);
    }

    logWarn(...messages) {
        console.warn("[SBO]", ...messages);
    }
}

export default new SBOSocket();