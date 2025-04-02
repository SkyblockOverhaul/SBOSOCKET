/// <reference types="../CTAutocomplete" />
import WebSocket from '../../Websocket';
import PogData from '../../PogData';
const File = Java.type("java.io.File");

class SBOSocket {
    constructor() {
        const protocol = "wss://";
        const hostname = "api.skyblockoverhaul.com";
        const path = "/sbo-ws";
        this.url = `${protocol}${hostname}${path}`;

        if (!new File("./config/sboSocket").exists()) {
            new File("./config/sboSocket").mkdirs();
        }
        this.data = new PogData("../../../config/sboSocket", { sboKey: "" }, "data.json");
        this.data.save();
        
        this.connected = false;
        this.unloaded = false;

        this.commands = [
            {cmd: "sbosocket", desc: "Show this message"},
            {cmd: "sbosetkey", desc: "Set your sbokey"},
            {cmd: "sboresetkey", desc: "Reset your sbokey"}
        ]

        this.eventListeners = {
            error: [],
            open: [],
            close: [],
            key: [],
            limited: []
        };

        this.registers();
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
                sbokey: this.sbokey
            });
            this.emit('open');
        };

        this.ws.onClose = () => {
            this.connected = false;
            this.emit('close');
            this.chatLog("Socket disconnected", "&c");
            if (this.unloaded) return;
        };

        this.on('key', (data) => {
            if (data.data) {
                ChatLib.chat("&6[SBO] &cInvalid sbokey! Use &e/sbosetkey <key>&c")
            }
        });

        this.on('limited', (data) => {
            if (data.data) {
                ChatLib.chat(`&6[SBO] &c${data.data}`);
            }
        });

        if (this.data.sboKey) this.sbokey = this.data.sboKey;
        if (!this.data.sboKey) {
            this.sbokey = java.util.UUID.randomUUID().toString().replace(/-/g, "");
            try {
                const mc = Client.getMinecraft();
                mc.func_152347_ac().joinServer(mc.func_110432_I().func_148256_e(), mc.func_110432_I().func_148254_d(), this.sbokey)
            } catch (e) {
                this.sbokey = undefined;
                print(JSON.stringify(e));
                this.chatLog("Failed to auth your connection. Try to restart your game or refresh your session", "&c");
            }
        }

        this.connect();
    }

    registers() {
        register("gameUnload", () => {
            this.unloaded = true;
            this.disconnect();
        });

        register("serverConnect", () => {
            this.connectStep.register();
        });

        register("serverDisconnect", () => {
            this.unloaded = true;
            this.disconnect();
        });

        this.connectStep = register("step", () => {
            if (!Scoreboard.getTitle()?.removeFormatting().includes("SKYBLOCK")) return;
            if (this.connected) return this.connectStep.unregister();
            this.initializeSocket();
            this.connectStep.unregister();
        }).setFps(1);

        register("command", (args1, ...args) => {
            if (!args1) return ChatLib.chat("&6[SBO] &cPlease provide a key");
            this.data.sboKey = args1;
            this.data.save();
            ChatLib.chat("&6[SBO] &aKey has been set");
        }).setName("sbosetkey");

        register("command", () => {
            this.data.sboKey = "";
            this.data.save();
            ChatLib.chat("&6[SBO] &aKey has been reset");
        }).setName("sboresetkey");

        register("command", () => {
            ChatLib.chat(ChatLib.getChatBreak("&b-"));
            ChatLib.chat("&aCan't connect or lag on reload? Set an sbokey from our Discord.")
            new TextComponent("&e&nDiscord Link")
            .setHover("show_text", "&aClick to Join the Discord")
            .setClick("open_url", "https://discord.gg/QvM6b9jsJD")
            .chat();
            ChatLib.chat(ChatLib.getChatBreak("&b-"));
            ChatLib.chat("&6[SBO] &eSocket Commands:");
            this.commands.forEach(({cmd, desc}) => {
                let text = new TextComponent(`&7> &a/${cmd} &7- &e${desc}`)
                .setClick("run_command", `/${cmd}`)
                .setHover("show_text", `&aClick to run &e/${cmd}`)
                text.chat();
            });
        }).setName("sbosocket");
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

    chatLog(message, cCode = "&7") {
        ChatLib.chat("&6[SBO] " + cCode + message);
    }   

    logError(...messages) {
        console.error("[SBO]", ...messages);
    }

    logWarn(...messages) {
        console.warn("[SBO]", ...messages);
    }
}

export const socket = new SBOSocket();