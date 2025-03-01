// v2 - Improved Service Worker for Pomodoro Timer

let timer = null;
let timerInterval = null;
let isRunning = false;
let lastActiveTime = Date.now();

// Save the current timer state
function saveTimerState() {
    return {
        timer,
        isRunning,
        lastUpdate: Date.now()
    };
}

// Handle timer tick and send updates to all clients
function handleTimerTick() {
    if (isRunning && timer > 0) {
        timer--;
        
        // Send update to all connected clients
        self.clients.matchAll().then(clients => {
            if (clients.length > 0) {
                clients.forEach(client => {
                    console.log('Sending timer update to client:', { timer: timer, isRunning: true });
                    client.postMessage({ timer: timer, isRunning: true });
                });
                lastActiveTime = Date.now(); // Update last active time
            }
        });
        
        // If timer reaches zero, stop it
        if (timer <= 0) {
            stopTimer();
        }
    }
}

// Start the timer
function startTimer(initialTime, interval) {
    timer = initialTime;
    isRunning = true;
    console.log('Starting timer in service worker with interval:', interval, 'timer:', timer);
    
    // Clear any existing interval
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Set new interval
    timerInterval = setInterval(handleTimerTick, interval);
    lastActiveTime = Date.now();
}

// Stop the timer and notify clients
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isRunning = false;
    console.log('Stopping timer in service worker, timer:', timer);
    
    // Notify all clients
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({ timer: timer, isRunning: false });
        });
    });
}

// Reset the timer to the specified value
function resetTimer(initialTime) {
    timer = initialTime;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isRunning = false;
    console.log('Resetting timer in service worker to:', timer);
    
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
    
    if (event.data.action === 'start') {
        startTimer(
            event.data.initialTime, 
            event.data.interval || 1000
        );
    } else if (event.data.action === 'stop') {
        stopTimer();
    } else if (event.data.action === 'reset') {
        resetTimer(event.data.initialTime);
    } else if (event.data.action === 'sync') {
        // Send current state to the requesting client
        event.source.postMessage({
            timer: timer,
            isRunning: isRunning
        });
    }
});

// Periodic cleanup check (every 5 minutes)
setInterval(() => {
    // If no client activity for 30 minutes, clean up resources
    if (Date.now() - lastActiveTime > 30 * 60 * 1000) {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        console.log('Cleaning up inactive timer');
    }
}, 5 * 60 * 1000);

// Service Worker installation
self.addEventListener('install', (event) => {
    console.log('Service Worker installing');
    self.skipWaiting(); // Activate immediately
});

// Service Worker activation
self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    event.waitUntil(
        self.clients.claim().then(() => {
            console.log('Service Worker activated and claimed clients');
        })
    );
});