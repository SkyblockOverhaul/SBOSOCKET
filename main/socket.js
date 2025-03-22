import WebSocket from '../../WebSocket';

class SBOSocket {
    constructor(hostname, path = "/sbo-ws") {
        const protocol = "wss://";
        this.url = `${protocol}${hostname}${path}`;
        
        this.ws = new WebSocket(this.url);
        
        // Event-Handler
        this.ws.onMessage = (msg) => console.log("Raw message:", msg);
        this.ws.onError = (err) => console.error("SBO Error:", err);
        this.ws.onOpen = () => console.log("SBO Connection established");
        this.ws.onClose = () => console.log("SBO Connection closed");
    }

    connect() {
        this.ws.connect();
    }

    sendCommand(command, data) {
        if (this.ws.readyState === WebSocket.OPEN) {
            const payload = JSON.stringify({
                cmd: command,
                data: data
            });
            this.ws.send(payload);
        } else {
            console.error("WebSocket is not open");
        }
    }

    on(event, callback) {
        switch(event) {
            case 'message':
                this.ws.onMessage = (msg) => {
                    try {
                        callback(JSON.parse(msg));
                    } catch(e) {
                        console.error("Invalid JSON:", msg);
                    }
                };
                break;
            case 'error':
                this.ws.onError = callback;
                break;
            case 'open':
                this.ws.onOpen = callback;
                break;
            case 'close':
                this.ws.onClose = callback;
                break;
            default:
                console.warn(`Unknown event: ${event}`);
                break;
        }
    }
}

export default SBOSocket