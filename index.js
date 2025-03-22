/// <reference types="../CTAutocomplete" />
import WebSocket from '../WebSocket';
class SBOSocket {
    constructor() {
        const protocol = "wss://";
        const hostname = "api.skyblockoverhaul.com"
        const path = "/sbo-ws";
        this.url = `${protocol}${hostname}${path}`;
        
        this.connected = false;
        this.unloaded = false;

        this.eventListeners = {
            error: [],
            open: [],
            close: []
        };

        this.chatLogging = true;

        this.initializeSocket();
        this.rgisters();
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
        };
        this.ws.onOpen = () => {
            this.chatLog("Socket connected", "&a");
            this.connected = true;
            this.emit('open');
        };
        this.ws.onClose = () => {
            if(!this.unloaded) this.chatLog("Socket closed pls do /ct reload to connect again", "&c");
            this.connected = false;
            this.emit('close');
        };
    }

    rgisters() {
        register("gameUnload", () => {
            this.unloaded = true;
            this.disconnect();
        });
    }

    connect() {
        this.ws.connect();
    }

    disconnect() {
        this.ws.close();
    }

    send(type, data = {}) {
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

    disableChatLogging() {
        this.chatLogging = false;
    }

    chatLog(message, cCode = "&7") {
        if (!this.chatLogging) return;
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