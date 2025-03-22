/// <reference types="../CTAutocomplete" />
import SBOSocket from './main/socket';

const socket = new SBOSocket("api.skyblockoverhaul.com"); 

// Event-Handler
socket.on('message', (response) => {
    console.log("Verarbeitete Antwort:", JSON.stringify(response, null, 2));
});

socket.on('error', (err) => {
    console.error("Verbindungsfehler:", err);
});

socket.connect();

register("command", (args) => {
    if (args) {
        socket.sendCommand('USER_MESSAGE', args);
    }
}).setName("SocketTest");