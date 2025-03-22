/* 
 * this creates a new Event wich needs to be specified in the server
 */
socket.addEvent('custom_event');

/* 
 * this listens for custom events from the server
 * and processes them
 */
socket.on('custom_event', (response) => {
    console.log("[SBO] Answer:", JSON.stringify(response, null, 2));
});

/* 
 * this connects to the server
 * and is needed to send and receive events
 */
socket.connect();

/* 
 * this sends a custom event to the server 
 * and gives the server the ability to respond
 */
socket.send('custom_event', args);