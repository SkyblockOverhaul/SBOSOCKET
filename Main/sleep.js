export default function sleep(timeout, callback) {
    let stepCount = 0;
    let stepHandler = register('step', () => {
    if (stepCount === 1) {
        callback();
        stepCount = 2;
        stepHandler.unregister();
    } 
    else stepCount++;
    });
    if (timeout < 1000) stepHandler.setFps(1000.0 / parseFloat(timeout));
    else stepHandler.setDelay(parseFloat(timeout) / 1000.0);
}