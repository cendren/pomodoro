// v3 - Fixed Service Worker for Pomodoro Timer

let timer = null;
let timerInterval = null;
let isRunning = false;
let lastActiveTime = Date.now();
let startTime = null; // Track when timer started
let pausedAt = null; // Track when timer was paused

// Handle timer tick more accurately by comparing with start time
function handleTimerTick() {
    if (!isRunning || timer <= 0) return;
    
    // Calculate elapsed time since timer started
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const expectedValue = startTime ? Math.max(0, pausedAt ? pausedAt : (timer - elapsedSeconds)) : timer;
    
    // Check for significant drift
    if (Math.abs(timer - expectedValue) > 2) {
        console.log(`Timer drift detected. Timer: ${timer}, Expected: ${expectedValue}`);
        timer = expectedValue;
    } else {
        // Normal countdown
        timer = Math.max(0, timer - 1);
    }
    
    console.log('Timer tick, current time:', timer);
    
    // Send update to all connected clients
    self.clients.matchAll().then(clients => {
        if (clients.length > 0) {
            clients.forEach(client => {
                client.postMessage({ timer: timer, isRunning: true });
            });
            lastActiveTime = now;
        }
    });
    
    // Check if timer reached zero
    if (timer <= 0) {
        console.log('Timer reached zero');
        clearInterval(timerInterval);
        timerInterval = null;
        isRunning = false;
        startTime = null;
        
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
    startTime = Date.now();
    pausedAt = null;
    
    // Clear any existing interval
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Set new interval with healthcheck
    timerInterval = setInterval(() => {
        try {
            handleTimerTick();
        } catch (error) {
            console.error('Error in timer tick:', error);
            // Try to recover
            if (isRunning) {
                clearInterval(timerInterval);
                timerInterval = setInterval(handleTimerTick, interval);
            }
        }
    }, interval);
    
    lastActiveTime = Date.now();
}

// Stop the timer
function stopTimer() {
    console.log('Stopping timer, current value:', timer);
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    if (isRunning) {
        isRunning = false;
        pausedAt = timer;
    }
    
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
            startTime = null;
            pausedAt = null;
            
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

// Keep service worker alive with periodic pings
setInterval(() => {
    console.log('Service worker health check, timer:', timer, 'isRunning:', isRunning);
    
    // Validate interval is still working if timer is running
    if (isRunning && !timerInterval) {
        console.log('Timer interval was lost, recreating');
        timerInterval = setInterval(handleTimerTick, 1000);
    }
}, 10000); // Check every 10 seconds

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