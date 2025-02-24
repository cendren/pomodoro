// Check if Service Worker is supported
const useServiceWorker = 'serviceWorker' in navigator;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired'); // Debug: Confirm script is loading
    const workTime = 25 * 60;  // 25 minutes in seconds
    const breakTime = 5 * 60;  // 5 minutes in seconds

    let timer = workTime; // Initialize with work time
    let isWorkSession = true;
    let isRunning = false; // Ensure the timer starts in a paused state
    let lastTickTime = Date.now(); // Track the last time the timer ticked
    let pausedTime = null; // Track the time when the timer was paused
    let interval = null; // Local interval for fallback
    let isTabVisible = !document.hidden; // Track tab visibility

    // Reference DOM elements
    const timerDisplay = document.getElementById('timer');
    const startPauseButton = document.getElementById('startPause');
    const resetButton = document.getElementById('reset');
    const sessionLabel = document.getElementById('sessionLabel');

    if (!timerDisplay || !startPauseButton || !resetButton || !sessionLabel) {
        console.error('One or more DOM elements not found:', { timerDisplay, startPauseButton, resetButton, sessionLabel });
        return; // Exit if elements are missing
    }

    // Update the displayed timer in mm:ss format
    function updateTimerDisplay() {
        console.log('Updating timer display, timer:', timer, 'isRunning:', isRunning); // Debug: Track updates
        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;
        const timeStr = `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
        timerDisplay.textContent = timeStr;
        document.title = `${isWorkSession ? 'Focus' : 'Break'} - ${timeStr}`; // Update title
    }

    // Switch between work and break sessions when the timer runs out
    function switchSession() {
        console.log('Switching session, isWorkSession:', isWorkSession); // Debug: Track session switches
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

    // Handle timer tick (local or from Service Worker)
    function handleTick(data) {
        console.log('Handling timer tick, data:', data, 'timer before:', timer, 'isRunning:', isRunning); // Debug: Track tick updates
        if (!isRunning) {
            console.log('Timer tick ignored—timer is paused');
            return; // Prevent tick if timer is paused
        }
        if (data && data.timer !== undefined) {
            timer = data.timer;
        } else {
            const elapsed = calculateElapsedTime(lastTickTime);
            timer = Math.max(0, timer - elapsed); // Ensure timer doesn't go negative
        }
        lastTickTime = Date.now();
        console.log('Timer after tick:', timer); // Debug: Track timer value
        if (timer <= 0) {
            clearInterval(interval); // Clear local interval
            if (useServiceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ action: 'stop' });
            }
            switchSession();
            startTimer();
        }
        updateTimerDisplay();
    }

    // Start the timer using Service Worker or local setInterval
    function startTimer() {
        console.log('Starting timer, isRunning:', isRunning, 'timer:', timer); // Debug: Track start attempts
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
            if (useServiceWorker && navigator.serviceWorker.controller) {
                console.log('Sending start message to service worker:', { action: 'start', initialTime: timer, interval: intervalMs });
                // Communicate with the service worker to start the timer
                navigator.serviceWorker.controller.postMessage({
                    action: 'start',
                    initialTime: timer,
                    interval: intervalMs
                });
                // Listen for updates from the service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    console.log('Received message from service worker:', event.data); // Debug: Track service worker messages
                    if (event.data.timer !== undefined) {
                        timer = event.data.timer;
                        updateTimerDisplay();
                    }
                    if (event.data.isRunning !== undefined) {
                        isRunning = event.data.isRunning;
                        startPauseButton.textContent = isRunning ? "Pause" : "Start";
                    }
                });
            } else {
                // Fallback: Use local setInterval
                interval = setInterval(() => handleTick(), intervalMs);
            }
            isRunning = true;
            startPauseButton.textContent = "Pause"; // Update button to "Pause"
        }
    }

    // Stop (pause) the timer
    function stopTimer() {
        console.log('Stopping timer, isRunning:', isRunning, 'timer:', timer); // Debug: Track stop attempts
        if (isRunning) {
            if (useServiceWorker && navigator.serviceWorker.controller) {
                console.log('Sending stop message to service worker');
                navigator.serviceWorker.controller.postMessage({ action: 'stop' });
            }
            clearInterval(interval); // Clear local interval
            isRunning = false;
            startPauseButton.textContent = "Start"; // Update button to "Start"
            pausedTime = Date.now(); // Record the time when paused
        }
    }

    // Handle tab visibility changes
    document.addEventListener('visibilitychange', () => {
        console.log('Tab visibility changed, isVisible:', !document.hidden, 'isRunning:', isRunning); // Debug: Track visibility
        isTabVisible = !document.hidden;
        if (document.hidden) {
            // Tab is hidden, adjust interval if using Service Worker or local
            if (isRunning) {
                if (useServiceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ action: 'start', initialTime: timer, interval: 5000 });
                } else {
                    clearInterval(interval);
                    interval = setInterval(() => handleTick(), 5000); // Use 5s interval in background
                }
            }
        } else {
            // Tab is visible, resume with 1-second interval
            if (isRunning) {
                if (useServiceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ action: 'start', initialTime: timer, interval: 1000 });
                } else {
                    clearInterval(interval);
                    interval = setInterval(() => handleTick(), 1000); // Use 1s interval when visible
                }
            }
        }
    });

    // Toggle Start/Pause on button click
    startPauseButton.addEventListener('click', function() {
        console.log('Start/Pause button clicked, isRunning:', isRunning); // Debug: Track button clicks
        if (isRunning) {
            stopTimer();
        } else {
            startTimer();
        }
    });

    // Reset timer to the start of the current session
    resetButton.addEventListener('click', function() {
        console.log('Reset button clicked'); // Debug: Track reset clicks
        stopTimer();
        timer = isWorkSession ? workTime : breakTime;
        lastTickTime = Date.now();
        pausedTime = null;
        if (useServiceWorker && navigator.serviceWorker.controller) {
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