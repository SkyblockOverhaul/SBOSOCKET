/// <reference types="../CTAutocomplete" />
import WebSocket from '../../WebSocket';
import PogData from '../../PogData';
import sleep from './sleep';
const File = Java.type("java.io.File");

class SBOSocket {
    constructor() {
        if (!new File("./config/sboSocket").exists()) {
            new File("./config/sboSocket").mkdirs();
        }
        this.url = "wss://api.skyblockoverhaul.com/sbo-ws";
        this.data = new PogData("../../../config/sboSocket", { sboKey: ""}, "data.json");
        this.data.save();
        this.connected = false;
        this.connecting = false; 
        this.unloaded = false;
        this.instaReconnect = true;
        this.autoReconnect = true
        this.commands = [
            {cmd: "sboSocket", desc: "Show this message"},
            {cmd: "sboSetKey", desc: "Set your sbokey"},
            {cmd: "sboResetKey", desc: "Reset your sbokey"},
            {cmd: "sboDisableReconnect", desc: "Disable auto reconnect"},
        ]
        this.eventListeners = {error: [], open: [], close: [], key: [], limited: []};
        this.closeCodes = [1006, 1011, 1001, 4000];
        this.registerHandlers();
        this.registerCommands();
        this.connect()
    }

    initializeSocket() {
        if (this.isBusyConnecting()) return
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connecting = true;
        this.ws = new WebSocket(this.url);

        this.ws.onMessage = (msg) => {
            const data = JSON.parse(msg);
            if (data.type && this.eventListeners[data.type]) this.emit(data.type, data);
        };

        this.ws.onError = (err) => {
            this.resetBusyConnecting();
            this.logError("Error:", JSON.stringify(err));
            this.emit('error', err);
        };

        this.ws.onOpen = () => {
            this.joinMojangSessionServer();
            this.connecting = false;
            this.connected = true;
            this.instaReconnect = true;
            this.logInfo("Connected to socket!");
            if (!this.sbokey) this.sbokey = "FailedToAuth";
            sleep(1000, () => {
                this.send('playerData', {
                    name: Player.getName(),
                    uuid: Player.getUUID(),
                    sbokey: this.sbokey
                })
            })
            if (this.sbokey == "FailedToAuth") this.sbokey = undefined;
            this.emit('open');
        };

        this.ws.onClose = (code, reason) => {
            this.resetBusyConnecting();
            this.logInfo("Socket disconnected! Code:", code, "Reason:", reason);
            this.emit('close');
            this.handleCloseCodes(code);
            this.handleReconnect(); 
        };

        this.on('key', (data) => {
            if (data.data) {
                this.logWarn("Invalid sbokey! Use &e/sbosetkey <key>")
                this.instaReconnect = false;
            }
        });

        this.on('limited', (data) => {
            if (data.data) {
                this.logWarn(`${data.data}`);
                this.instaReconnect = false;
            }
        });

        this.on('error', (data) => {
            if (data.data) {
                this.logError(`${data.data}`);
                this.instaReconnect = false;
            }
        });

        this.ws.connect();
    }

    registerHandlers() {
        register("gameUnload", () => this.handleUnload());
        register("serverConnect", () => this.handleServerConnect());
        register("serverDisconnect", () => this.handleServerDisconnect());
    }

    registerCommands() {
        this.addCommand("sboSocket", () => {
            ChatLib.chat(ChatLib.getChatBreak("&b-"));
            ChatLib.chat("&aCan't connect or lag on reload? Set an sbokey from our Discord.")
            new TextComponent("&e&nDiscord Link").setHover("show_text", "&aClick to Join the Discord").setClick("open_url", "https://discord.gg/QvM6b9jsJD").chat();
            ChatLib.chat(ChatLib.getChatBreak("&b-"));
            ChatLib.chat("&6[SBO] &eSocket Commands:");
            this.commands.forEach(({cmd, desc}) => {
                let text = new TextComponent(`&7> &a/${cmd} &7- &e${desc}`).setClick("run_command", `/${cmd}`).setHover("show_text", `&aClick to run &e/${cmd}`)
                text.chat();
            });
        });
        this.addCommand("sboSetKey", (arg) => {
            if (!arg) return ChatLib.chat("&6[SBO] &cPlease provide a key");
            if (!arg.startsWith("sbo")) return ChatLib.chat("&6[SBO] &cInvalid key format! get one in our Discord");
            this.data.sboKey = this.sbokey = arg;
            this.data.save();
            ChatLib.chat("&6[SBO] &aKey has been set");
        });
        this.addCommand("sboResetKey", () => {
            this.data.sboKey = ""
            this.sbokey = this.generateKey();
            this.data.save();
            ChatLib.chat("&6[SBO] &aKey has been reset");
        });
        this.addCommand("sboDisableReconnect", () => {
            this.autoReconnect = false
            ChatLib.chat(`&6[SBO] &aAuto reconnect has been disabled`);
        });
    }

    handleServerConnect() {
        if (this.isBusyConnecting()) return
        this.instaReconnect = true;
        this.autoReconnect = true;
        this.disconnected = false;
        this.connect();
    }

    handleServerDisconnect() {
        this.disconnected = true;
        this.disconnect();
    }

    handleUnload() {
        this.unloaded = true;
        this.disconnect();
    }

    handleReconnect() {
        if (this.isBusyConnecting()) return
        if (this.disconnected) return
        if (this.unloaded) return
        if (this.instaReconnect) return sleep(2000, () => this.connect());
        if (this.autoReconnect) return sleep(60000, () => this.connect());
    }

    handleCloseCodes(code) {
        if (this.closeCodes.includes(code)) {
            this.instaReconnect = false;
            this.logWarn("Server rejected connection, waiting 60s before reconnect...", "&c");
        }
    } 

    disconnect() {
        this.resetBusyConnecting();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    connect() {
        if (this.isBusyConnecting()) return
        this.initializeSocket();
        this.instaReconnect = false;
    }

    joinMojangSessionServer() {
        if (this.data.sboKey) this.sbokey = this.data.sboKey;
        if (this.data.sboKey && !this.sbokey.startsWith("sbo")) this.sbokey = this.generateKey(), this.data.sboKey = "", this.data.save();
        if (!this.data.sboKey) {
            if (!this.sbokey) this.sbokey = this.generateKey();
            try {
                const mc = Client.getMinecraft();
                mc.func_152347_ac().joinServer(mc.func_110432_I().func_148256_e(), mc.func_110432_I().func_148254_d(), this.sbokey)
            } catch (e) {
                this.sbokey = undefined;
                print(JSON.stringify(e));
                this.logWarn("Failed to auth your connection. Try to restart your game or refresh your session");
                this.logWarn("you can also set an sbokey from our Discord for this not to happen")
            }
        }
    }

    send(type, data = {}) {
        this.connected
            ? this.ws.send(JSON.stringify({ type, data }))
            : this.logWarn("Socket not connected, message not sent");
    }

    addEvent(event) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
    }

    on(event, callback) {
        this.eventListeners[event]
            ? this.eventListeners[event].push(callback)
            : this.logWarn(`Unknown event: ${event}`);
    }

    emit(event, ...args) {
        this.eventListeners[event]?.forEach((callback) => {
            try { callback(...args); } 
            catch (e) { this.logError(`Error in ${event} listener:`, JSON.stringify(e)); }
        });
    }

    addCommand = (name, callback) => register("command", callback).setName(name);
    generateKey() { return java.util.UUID.randomUUID().toString().replace(/-/g, ""); }
    isBusyConnecting() { return this.connected || this.connecting; }
    resetBusyConnecting() { this.connected = false; this.connecting = false; }   
    getSbokey() { return this.sbokey; }
    logInfo(...msg) { console.log("[SBO]", ...msg); }
    logError(...msg) { console.error("[SBO]", ...msg); }
    logWarn(...msg) { console.warn("[SBO]", ...msg); }
}

export const socket = new SBOSocket();