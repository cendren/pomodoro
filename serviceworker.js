let timer = null;
let timerInterval = null;
let isRunning = false;

self.addEventListener('message', (event) => {
    if (event.data.action === 'start') {
        timer = event.data.initialTime;
        const interval = event.data.interval; // 1000ms or 5000ms
        isRunning = true;
        timerInterval = setInterval(() => {
            if (timer > 0) {
                timer--;
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => client.postMessage({ timer: timer, isRunning: true }));
                });
            } else {
                clearInterval(timerInterval);
                timerInterval = null;
                isRunning = false;
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => client.postMessage({ timer: 0, isRunning: false }));
                });
            }
        }, interval);
    } else if (event.data.action === 'stop') {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        isRunning = false;
        self.clients.matchAll().then(clients => {
            clients.forEach(client => client.postMessage({ isRunning: false }));
        });
    } else if (event.data.action === 'reset') {
        timer = event.data.initialTime;
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        isRunning = false;
        self.clients.matchAll().then(clients => {
            clients.forEach(client => client.postMessage({ timer: timer, isRunning: false }));
        });
    }
});

// Optional: Clean up on service worker activation if needed
self.addEventListener('activate', (event) => {
    event.waitUntil(
        self.clients.claim().then(() => {
            console.log('Service Worker activated and claimed clients');
        })
    );
});

//1