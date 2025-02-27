// Check if Service Worker is supported
const useServiceWorker = 'serviceWorker' in navigator;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired'); // Debug: Confirm script is loading
    const workTime = 25 * 60;  // 25 minutes in seconds
    const breakTime = 5 * 60;  // 5 minutes in seconds (optional, for future expansion)

    let timer = workTime; // Initialize with 25 minutes
    let isRunning = false; // Ensure the timer starts in a paused state
    let lastTickTime = Date.now(); // Track the last time the timer ticked
    let isFocusSession = true; // Track whether it's a focus or break session
    let interval = null; // Local interval for fallback (explicitly initialized)

    // Reference DOM elements
    const timerDisplay = document.getElementById('timer');
    const startPauseButton = document.getElementById('startPause');
    const resetButton = document.getElementById('reset');
    const sessionLabel = document.getElementById('sessionLabel');

    if (!timerDisplay || !startPauseButton || !resetButton || !sessionLabel) {
        console.error('One or more DOM elements not found:', { timerDisplay, startPauseButton, resetButton, sessionLabel });
        return; // Exit if elements are missing
    }

    // Update the displayed timer and session label in mm:ss format
    function updateTimerDisplay() {
        console.log('Updating timer display, timer:', timer, 'isRunning:', isRunning, 'isFocusSession:', isFocusSession); // Debug: Track updates
        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;
        const timeStr = `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
        timerDisplay.textContent = timeStr;
        document.title = `Pomodoro - ${timeStr}`; // Update title

        // Update session label based on state
        if (!isRunning && timer > 0 && timer <= 1499) { // Between 24:59 and 00:01 (1–1499 seconds)
            sessionLabel.textContent = "Paused";
        } else if (timer <= 0) {
            sessionLabel.textContent = "Break Time";
        } else if (isFocusSession) {
            sessionLabel.textContent = "Focus Session";
        } else {
            sessionLabel.textContent = "Break Time";
        }
    }

    // Calculate elapsed time based on real time
    function calculateElapsedTime(startTime, endTime = Date.now()) {
        return Math.floor((endTime - startTime) / 1000); // Convert to seconds
    }

    // Handle timer tick (from Service Worker or local)
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
            if (elapsed > 0) { // Only update if time has elapsed
                timer = Math.max(0, timer - elapsed); // Decrease by elapsed seconds
            }
        }
        lastTickTime = Date.now();
        console.log('Timer after tick:', timer); // Debug: Track timer value
        if (timer <= 0) {
            if (useServiceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ action: 'stop' });
            }
            isRunning = false;
            isFocusSession = false; // Switch to break session when timer ends
            startPauseButton.textContent = "Start"; // Reset button to "Start" when timer ends
            updateTimerDisplay();
        }
        updateTimerDisplay();
    }

    // Start the timer using Service Worker or local setInterval
    function startTimer() {
        console.log('Starting timer, isRunning:', isRunning, 'timer:', timer); // Debug: Track start attempts
        if (!isRunning) {
            lastTickTime = Date.now();
            const intervalMs = 1000; // Always use 1-second intervals for accuracy
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
                clearInterval(interval); // Ensure no previous interval is running
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
            if (interval) { // Only clear interval if it exists (fix for ReferenceError)
                clearInterval(interval); // Clear local interval
            }
            isRunning = false;
            startPauseButton.textContent = "Start"; // Update button to "Start"
        }
    }

    // Reset timer to 25 minutes and stop it
    function resetTimer() {
        console.log('Resetting timer'); // Debug: Track reset attempts
        stopTimer();
        timer = workTime;
        isFocusSession = true; // Reset to focus session
        lastTickTime = Date.now();
        updateTimerDisplay();
        if (useServiceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ action: 'reset', initialTime: timer });
        }
    }

    // Handle tab visibility changes (optional, since service worker handles background)
    document.addEventListener('visibilitychange', () => {
        console.log('Tab visibility changed, isVisible:', !document.hidden, 'isRunning:', isRunning); // Debug: Track visibility
        isTabVisible = !document.hidden;
        // No need to adjust intervals here—service worker handles background timing
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

    // Reset button click handler
    resetButton.addEventListener('click', function() {
        resetTimer();
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