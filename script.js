// Check if Service Worker is supported
const useServiceWorker = 'serviceWorker' in navigator;

document.addEventListener('DOMContentLoaded', () => {
    const workTime = 25 * 60;  // 25 minutes in seconds
    const breakTime = 5 * 60;  // 5 minutes in seconds

    let timer = workTime; // Initialize with work time
    let isWorkSession = true;
    let isRunning = false; // Ensure the timer starts in a paused state
    let lastTickTime = Date.now(); // Track the last time the timer ticked
    let pausedTime = null; // Track the time when the timer was paused
    let isTabVisible = !document.hidden; // Track tab visibility

    // Reference DOM elements
    const timerDisplay = document.getElementById('timer');
    const startPauseButton = document.getElementById('startPause');
    const resetButton = document.getElementById('reset');
    const sessionLabel = document.getElementById('sessionLabel');

    // Update the displayed timer in mm:ss format
    function updateTimerDisplay() {
        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;
        const timeStr = `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
        timerDisplay.textContent = timeStr;
        document.title = `${isWorkSession ? 'Focus' : 'Break'} - ${timeStr}`; // Update title
    }

    // Switch between work and break sessions when the timer runs out
    function switchSession() {
        if (isWorkSession) {
            alert("Focus session complete! Time for a break.");
            timer = breakTime;
            sessionLabel.textContent = "Break Session";
        } else {
            alert("Break over! Back to focus.");
            timer = workTime;
            sessionLabel.textContent = "Focus Session";
        }
        isWorkSession = !isWorkSession;
        updateTimerDisplay();
        if (isRunning) {
            stopTimer(); // Stop the current timer
            startTimer(); // Start the new session automatically
        }
    }

    // Calculate elapsed time based on real time
    function calculateElapsedTime(startTime, endTime = Date.now()) {
        return Math.floor((endTime - startTime) / 1000); // Convert to seconds
    }

    // Handle timer tick (from Service Worker)
    function handleTick(data) {
        if (data && data.timer !== undefined) {
            timer = data.timer;
        } else {
            const elapsed = calculateElapsedTime(lastTickTime);
            timer = Math.max(0, timer - elapsed); // Ensure timer doesn't go negative
        }
        lastTickTime = Date.now();
        if (timer <= 0) {
            if (useServiceWorker) {
                navigator.serviceWorker.controller.postMessage({ action: 'stop' });
            }
            switchSession();
            startTimer();
        }
        updateTimerDisplay();
    }

    // Start the timer using Service Worker
    function startTimer() {
        if (!isRunning) {
            // If pausedTime exists, adjust timer for time spent paused
            if (pausedTime) {
                const elapsedWhilePaused = calculateElapsedTime(pausedTime);
                timer = Math.max(0, timer - elapsedWhilePaused);
                pausedTime = null;
                updateTimerDisplay();
            }
            
            lastTickTime = Date.now();
            const intervalMs = isTabVisible ? 1000 : 5000; // 1s when visible, 5s when hidden
            if (useServiceWorker) {
                // Communicate with the service worker to start the timer
                navigator.serviceWorker.controller.postMessage({
                    action: 'start',
                    initialTime: timer,
                    interval: intervalMs
                });
                // Listen for updates from the service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data.timer !== undefined) {
                        timer = event.data.timer;
                        updateTimerDisplay();
                    }
                    if (event.data.isRunning !== undefined) {
                        isRunning = event.data.isRunning;
                        startPauseButton.textContent = isRunning ? "Pause" : "Start";
                    }
                });
            }
            isRunning = true;
            startPauseButton.textContent = "Pause"; // Update button to "Pause"
        }
    }

    // Stop (pause) the timer
    function stopTimer() {
        if (isRunning) {
            if (useServiceWorker) {
                navigator.serviceWorker.controller.postMessage({ action: 'stop' });
            }
            isRunning = false;
            startPauseButton.textContent = "Start"; // Update button to "Start"
            pausedTime = Date.now(); // Record the time when paused
        }
    }

    // Handle tab visibility changes
    document.addEventListener('visibilitychange', () => {
        isTabVisible = !document.hidden;
        if (document.hidden) {
            // Tab is hidden, adjust interval if using Service Worker
            if (isRunning && useServiceWorker) {
                navigator.serviceWorker.controller.postMessage({ action: 'start', initialTime: timer, interval: 5000 });
            }
        } else {
            // Tab is visible, resume with 1-second interval
            if (isRunning && useServiceWorker) {
                navigator.serviceWorker.controller.postMessage({ action: 'start', initialTime: timer, interval: 1000 });
            }
        }
    });

    // Toggle Start/Pause on button click
    startPauseButton.addEventListener('click', function() {
        if (isRunning) {
            stopTimer();
        } else {
            startTimer();
        }
    });

    // Reset timer to the start of the current session
    resetButton.addEventListener('click', function() {
        stopTimer();
        timer = isWorkSession ? workTime : breakTime;
        lastTickTime = Date.now();
        pausedTime = null;
        if (useServiceWorker) {
            navigator.serviceWorker.controller.postMessage({ action: 'reset', initialTime: timer });
        }
        updateTimerDisplay();
    });

    // Initialize the timer display without auto-starting
    updateTimerDisplay();
    startPauseButton.textContent = "Start"; // Ensure button starts as "Start"

    // Register and sync with service worker if available
    if (useServiceWorker) {
        navigator.serviceWorker.register('serviceWorker.js').then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
        }).catch(error => {
            console.error('Service Worker registration failed:', error);
        });
    }
});
