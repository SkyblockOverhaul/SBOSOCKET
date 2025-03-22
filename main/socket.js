import WebSocket from '../../WebSocket';

class SBOSocket {
    constructor(hostname, path = "/sbo-ws") {
        const protocol = "wss://";
        this.url = `${protocol}${hostname}${path}`;
        
        this.reconnectInterval = 120000;
        this.reconnectTimeout = null;
        this.connected = false;

        // Standard-Event-Listener
        this.eventListeners = {
            error: [],
            open: [],
            close: []
        };

        this.initializeWebSocket();
    }

    initializeWebSocket() {
        this.ws = new WebSocket(this.url);

        this.ws.onMessage = (msg) => {
            const data = JSON.parse(msg);
            if (data.type !== "handshake") {
                if (data.type && this.eventListeners[data.type]) {
                    this.emit(data.type, data);
                }
            }
        };
        this.ws.onError = (err) => {
            this.logError("Error:", err);
            this.emit('error', err);
            this.scheduleReconnect();
        };
        this.ws.onOpen = () => {
            this.log("Connection established");
            this.connected = true;
            this.emit('open');
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }
        };
        this.ws.onClose = () => {
            this.log("Connection closed");
            this.connected = false;
            this.emit('close');
            this.scheduleReconnect();
        };
    }

    connect() {
        this.log("Attempting to connect...");
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
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        this.log(`Attempting to reconnect in ${this.reconnectInterval / 1000} seconds...`);

        this.reconnectTimeout = setTimeout(() => {
            this.log("Reconnecting...");
            this.initializeWebSocket();
            this.connect();
        }, this.reconnectInterval);
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

export default SBOSocket;