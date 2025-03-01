// Service Worker for Pomodoro Timer
// Handles background timing

let timer = null;
let timerInterval = null;
let isRunning = false;

// Handle timer tick - simple one-second decrement
function handleTimerTick() {
    if (!isRunning || timer <= 0) return;
    
    // Decrement timer by 1 second
    timer = Math.max(0, timer - 1);
    
    console.log('Timer tick, current time:', timer);
    
    // Send update to all connected clients
    self.clients.matchAll().then(clients => {
        if (clients.length > 0) {
            clients.forEach(client => {
                client.postMessage({ timer: timer, isRunning: true });
            });
        }
    });
    
    // Check if timer reached zero
    if (timer <= 0) {
        console.log('Timer reached zero');
        clearInterval(timerInterval);
        timerInterval = null;
        isRunning = false;
        
        // Notify clients about completion
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({ 
                    timer: 0, 
                    isRunning: false,
                    timerComplete: true
                });
            });
        });
    }
}

// Start the timer
function startTimer(initialTime, interval) {
    console.log(`Starting timer with ${initialTime} seconds and ${interval}ms interval`);
    timer = initialTime;
    isRunning = true;
    
    // Clear any existing interval
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Set new interval
    timerInterval = setInterval(() => {
        try {
            handleTimerTick();
        } catch (error) {
            console.error('Error in timer tick:', error);
        }
    }, interval);
}

// Stop the timer
function stopTimer() {
    console.log('Stopping timer, current value:', timer);
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    isRunning = false;
    
    // Notify all clients
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({ timer: timer, isRunning: false });
        });
    });
}

// Handle messages from clients
self.addEventListener('message', (event) => {
    console.log('Service Worker received message:', event.data);
    
    try {
        if (event.data.action === 'start') {
            startTimer(
                event.data.initialTime, 
                event.data.interval || 1000
            );
        } else if (event.data.action === 'stop') {
            stopTimer();
        } else if (event.data.action === 'reset') {
            timer = event.data.initialTime;
            isRunning = false;
            
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            
            console.log('Reset timer to:', timer);
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({ timer: timer, isRunning: false });
                });
            });
        } else if (event.data.action === 'sync') {
            console.log('Sync requested, current timer:', timer, 'isRunning:', isRunning);
            // Send current state to the requesting client
            event.source.postMessage({
                timer: timer,
                isRunning: isRunning,
                serviceWorkerActive: true
            });
        }
    } catch (error) {
        console.error('Error processing message:', error);
        // Try to notify client about the error
        event.source.postMessage({
            error: `Error: ${error.message}`,
            timer: timer,
            isRunning: false
        });
    }
});

// Service Worker installation
self.addEventListener('install', (event) => {
    console.log('Service Worker installing');
    self.skipWaiting();
});

// Service Worker activation
self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    event.waitUntil(self.clients.claim());
});