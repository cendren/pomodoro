let timer = null;
let timerInterval = null;
let isRunning = false;

self.addEventListener('message', (event) => {
    console.log('Service Worker received message:', event.data); // Debug: Track incoming messages
    if (event.data.action === 'start') {
        timer = event.data.initialTime;
        const interval = event.data.interval; // 1000ms or 5000ms
        isRunning = true;
        console.log('Starting timer in service worker with interval:', interval, 'timer:', timer, 'isRunning:', isRunning);
        if (timerInterval) {
            clearInterval(timerInterval); // Clear any existing interval to prevent duplicates
        }
        timerInterval = setInterval(() => {
            if (isRunning && timer > 0) { // Only count down if running and timer > 0
                timer--;
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        console.log('Sending timer update to client:', { timer: timer, isRunning: true });
                        client.postMessage({ timer: timer, isRunning: true });
                    });
                });
            } else if (timer <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                isRunning = false;
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        console.log('Timer completed, sending update:', { timer: 0, isRunning: false });
                        client.postMessage({ timer: 0, isRunning: false });
                    });
                });
            }
        }, interval);
    } else if (event.data.action === 'stop') {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        isRunning = false;
        console.log('Stopping timer in service worker, timer:', timer, 'isRunning:', isRunning);
        self.clients.matchAll().then(clients => {
            clients.forEach(client => client.postMessage({ timer: timer, isRunning: false })); // Send current timer value
        });
    } else if (event.data.action === 'reset') {
        timer = event.data.initialTime;
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        isRunning = false;
        console.log('Resetting timer in service worker to:', timer, 'isRunning:', isRunning);
        self.clients.matchAll().then(clients => {
            clients.forEach(client => client.postMessage({ timer: timer, isRunning: false }));
        });
    }
});

// Optional: Clean up on service worker activation if needed
self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    event.waitUntil(
        self.clients.claim().then(() => {
            console.log('Service Worker activated and claimed clients');
        })
    );
});