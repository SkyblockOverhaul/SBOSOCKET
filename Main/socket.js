/// <reference types="../CTAutocomplete" />
import WebSocket from '../../Websocket';
import PogData from '../../PogData';
const File = Java.type("java.io.File");

class SBOSocket {
    constructor() {
        if (!new File("./config/sboSocket").exists()) {
            new File("./config/sboSocket").mkdirs();
        }
        this.url = "wss://api.skyblockoverhaul.com/sbo-ws";
        this.data = new PogData("../../../config/sboSocket", { sboKey: "", reconnect: true }, "data.json");
        this.data.save();
        this.connected = false;
        this.connecting = false; 
        this.unloaded = false;
        this.stepActive = false;
        this.instaReconnect = true;
        this.commands = [
            {cmd: "sboSocket", desc: "Show this message"},
            {cmd: "sboSetKey", desc: "Set your sbokey"},
            {cmd: "sboResetKey", desc: "Reset your sbokey"},
            {cmd: "sboSetReconnect", desc: "Toggle auto reconnect"},
        ]
        this.eventListeners = {error: [], open: [], close: [], key: [], limited: []};
        this.registerHandlers();
    }

    initializeSocket() {
        if (this.connected || this.connecting) return this.logWarn("Connection already in progress or established");
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
            this.connecting = false;
            this.logError("Error:", JSON.stringify(err));
            this.emit('error', err);
        };

        this.ws.onOpen = () => {
            this.chatLog("Socket connected", "&a");
            this.connecting = false;
            this.connected = true;
            this.instaReconnect = true;
            this.send('playerData', {
                name: Player.getName(),
                uuid: Player.getUUID(),
                sbokey: this.sbokey
            });
            this.emit('open');
        };

        this.ws.onClose = (code) => {
            this.connecting = false;
            this.connected = false;
            this.emit('close');
            this.chatLog("Socket disconnected", "&c");
            print(code);
            if (code === 1006 || code === 1011 || code === 1001 || code === 4000) { // still needs testing
                this.instaReconnect = false;
                this.chatLog("Server rejected connection, waiting before reconnect...", "&c");
            }        
            if (!this.stepActive && !this.unloaded && this.data.reconnect) {
                this.connectStep.register();
                this.stepActive = true;
                if (!this.instaReconnect) {
                    this.chatLog("trying to reconnect in 60 seconds", "&c");
                    new TextComponent("&6[SBO] [&e&nDisable/Enable AutoReconnect&r&6]").setHover("show_text", "&aClick to disable AutoReconnect").setClick("run_command", "/sboSetReconnect").chat();
                } 
                else this.chatLog("Attempting immediate reconnect...", "&c");
            }
        };

        this.on('key', (data) => {
            if (data.data) {
                ChatLib.chat("&6[SBO] &cInvalid sbokey! Use &e/sbosetkey <key>&c")
                this.instaReconnect = false;
            }
        });

        this.on('limited', (data) => {
            if (data.data) {
                ChatLib.chat(`&6[SBO] &c${data.data}`);
                this.instaReconnect = false;
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

        this.ws.connect();
    }

    registerHandlers() {
        register("gameUnload", () => this.handleUnload());
        register("serverConnect", () => this.handleServerConnect());
        register("serverDisconnect", () => this.disconnect());
        this.registerCommands();

        this.connectStep = register("step", () => {
            if (!Scoreboard.getTitle()?.removeFormatting().includes("SKYBLOCK")) return;
            const now = new Date().getTime();
            if (!this.lastConnect || now - this.lastConnect >= 60000 || this.instaReconnect) this.connect(now);
        }).setFps(1);
    }

    registerCommands() {
        register("command", () => {
            ChatLib.chat(ChatLib.getChatBreak("&b-"));
            ChatLib.chat("&aCan't connect or lag on reload? Set an sbokey from our Discord.")
            new TextComponent("&e&nDiscord Link").setHover("show_text", "&aClick to Join the Discord").setClick("open_url", "https://discord.gg/QvM6b9jsJD").chat();
            ChatLib.chat(ChatLib.getChatBreak("&b-"));
            ChatLib.chat("&6[SBO] &eSocket Commands:");
            this.commands.forEach(({cmd, desc}) => {
                let text = new TextComponent(`&7> &a/${cmd} &7- &e${desc}`).setClick("run_command", `/${cmd}`).setHover("show_text", `&aClick to run &e/${cmd}`)
                text.chat();
            });
        }).setName("sbosocket");

        [
            ["sbosetkey", (arg) => {
                if (!arg) return ChatLib.chat("&6[SBO] &cPlease provide a key");
                this.data.sboKey = this.sbokey = arg;
                this.data.save();
                ChatLib.chat("&6[SBO] &aKey has been set");
            }],
            ["sboresetkey", () => {
                this.data.sboKey = this.sbokey = "";
                this.data.save();
                ChatLib.chat("&6[SBO] &aKey has been reset");
            }],
            ["sboSetReconnect", () => {
                this.data.reconnect = !this.data.reconnect;
                this.data.save();
                ChatLib.chat(`&6[SBO] &${this.data.reconnect ? "aAuto reconnect enabled" : "cAuto reconnect disabled"}`);
            }]
        ].forEach(([cmd, cb]) => register("command", cb).setName(cmd));
    }

    handleServerConnect() {
        if (!this.stepActive) {
            this.connectStep.register();
            this.stepActive = true;
        }
    }

    handleUnload() {
        this.unloaded = true;
        this.disconnect();
    }

    disconnect() {
        this.connecting = false;
        this.connected = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connectStep.unregister();
        this.stepActive = false;
    }

    connect(now) {
        if (this.connected || this.connecting) return this.logWarn("Already connected or connecting");
        this.lastConnect = now;
        this.initializeSocket();
        this.connectStep.unregister();
        this.stepActive = false;
        this.instaReconnect = false;
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

    getSbokey() { return this.sbokey; }
    chatLog(msg, code = "&7") { ChatLib.chat("&6[SBO] " + code + msg); }   
    logError(...msg) { console.error("[SBO]", ...msg); }
    logWarn(...msg) { console.warn("[SBO]", ...msg); }
}

export const socket = new SBOSocket();