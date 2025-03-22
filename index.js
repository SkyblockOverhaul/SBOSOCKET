/// <reference types="../CTAutocomplete" />
import SBOSocket from './main/socket';
export default SBOSocket;

const socket = new SBOSocket("api.skyblockoverhaul.com");
socket.addEvent('custom_event');

socket.on('custom_event', (response) => {
    console.log("[SBO] Verarbeitete Antwort:", JSON.stringify(response, null, 2));
});

socket.connect();

register("command", (args) => {
    if (args) {
        socket.send('custom_event', args);
    }
}).setName("SocketTest");