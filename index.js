/// <reference types="../CTAutocomplete" />
import WebSocket from '../WebSocket';
import PogData from '../PogData';
const File = Java.type("java.io.File");
class SBOSocket {
    constructor() {
        const protocol = "wss://";
        const hostname = "api.skyblockoverhaul.com"
        const path = "/sbo-ws";
        this.url = `${protocol}${hostname}${path}`;

        if (!new File("./config/sboSocket").exists()) {
            new File("./config/sboSocket").mkdirs();
        }
        this.data = new PogData("../../../config/sboSocket", { sboKey: "" }, "data.json");
        this.data.save();
        
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
            this.logError("Error:", JSON.stringify(err));
            this.emit('error', err);
        };
        this.ws.onOpen = () => {
            this.chatLog("Socket connected", "&a");
            this.connected = true;
            this.send('playerData', {
                name: Player.getName(),
                uuid: Player.getUUID(),
                serverId: this.sbokey
            });
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

        const connectStep = register("step", () => {
            if (!Scoreboard.getTitle()?.removeFormatting().includes("SKYBLOCK")) return;
            this.connect();
            this.sbokey = this.data.sboKey ? this.data.sboKey : java.util.UUID.randomUUID().toString().replace(/-/g, "");
            try {
                const mc = Client.getMinecraft();
                mc.func_152347_ac().joinServer(mc.func_110432_I().func_148256_e(), mc.func_110432_I().func_148254_d(), this.sbokey)
            }
            catch (e) { this.sbokey = undefined; print(JSON.stringify(e)) }
            connectStep.unregister();
        }).setFps(1);

        register("command", (args1, ...args) => {
            if (!args1) return ChatLib.chat("&6[SBO] &cPlease provide a key")
            this.data.sboKey = args1
            this.data.save()
            ChatLib.chat("&6[SBO] &aKey has been set")
        }).setName("sbosetkey")

        register("command", () => {
            this.data.sboKey = ""
            this.data.save()
            ChatLib.chat("&6[SBO] &aKey has been reset")
        }).setName("sboresetkey")
            
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
                    this.logError(`Error in ${event} listener:`, JSON.stringify(e));
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

const socket = new SBOSocket();
export default socket;