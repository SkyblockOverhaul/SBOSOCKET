socket.addEvent('custom_event');

socket.on('custom_event', (response) => {
    console.log("[SBO] Verarbeitete Antwort:", JSON.stringify(response, null, 2));
});

socket.connect();

register("command", (args) => {
    if (args) {
        socket.send('custom_event', args);
    }
    console.log("[SBO] Verbindung manuell getrennt");
}).setName("SocketTest");