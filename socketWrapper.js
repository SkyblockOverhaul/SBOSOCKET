/*
 * The jar is from https://github.com/TooTallNate/Java-WebSocket/releases/tag/v1.6.0
 */

/*
* Wrapper code from Debbugings just changes the jar so the stupid error is gone with tls1.2 || https://chattriggers.com/modules/v/WebSocket
*/

export default class WebSocket {
    constructor(address) {
        this.address = address;

        this.onMessage = () => {};
        this.onError = () => {};
        this.onOpen = () => {};
        this.onClose = () => {};

        const _this = this;

        this.socket = new JavaAdapter(org.java_websocket.client.WebSocketClient, {    
            onMessage(message) {
                _this.onMessage(message)
            },
            onError(exception) {
                _this.onError(exception);
            },
            onOpen(handshake) {
                _this.onOpen(handshake);
            },
            onClose(code, reason, remote) {
                _this.onClose(code, reason, remote);
            }
        }, new java.net.URI(this.address));
    }

    send(message) {
        this.socket.send(message);
    }

    connect() {
        this.socket.connect();
    }

    close() {
        this.socket.close();
    }

    reconnect() {
        this.socket.reconnect();
    }
}
