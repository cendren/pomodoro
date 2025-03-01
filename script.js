// Check if Service Worker and Promise are supported
const useServiceWorker = 'serviceWorker' in navigator && 'Promise' in window;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    const workTime = 25 * 60;  // 25 minutes in seconds
    const breakTime = 5 * 60;  // 5 minutes in seconds

    let timer = workTime; // Initialize with 25 minutes
    let isRunning = false; // Ensure the timer starts in a paused state
    let lastTickTime = Date.now(); // Track the last time the timer ticked
    let isFocusSession = true; // Track whether it's a focus or break session
    let interval = null; // Local interval for fallback
    let messageListener = null; // Store reference to service worker message listener

    // Reference DOM elements
    const timerDisplay = document.getElementById('timer');
    const startPauseButton = document.getElementById('startPause');
    const resetButton = document.getElementById('reset');
    const sessionLabel = document.getElementById('sessionLabel');
    const toggleSessionButton = document.getElementById('toggleSession');

    if (!timerDisplay || !startPauseButton || !resetButton || !sessionLabel) {
        console.error('One or more DOM elements not found:', { timerDisplay, startPauseButton, resetButton, sessionLabel });
        return; // Exit if elements are missing
    }

    // Update the displayed timer and session label in mm:ss format
    function updateTimerDisplay() {
        console.log('Updating timer display, timer:', timer, 'isRunning:', isRunning, 'isFocusSession:', isFocusSession);
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

        // Update toggle button text if it exists
        if (toggleSessionButton) {
            toggleSessionButton.textContent = isFocusSession ? "Switch to Break" : "Switch to Focus";
        }
    }

    // Calculate elapsed time based on real time
    function calculateElapsedTime(startTime, endTime = Date.now()) {
        return Math.floor((endTime - startTime) / 1000); // Convert to seconds
    }

    // Handle timer tick (from Service Worker or local)
    function handleTick(data) {
        console.log('Handling timer tick, data:', data, 'timer before:', timer, 'isRunning:', isRunning);
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
        console.log('Timer after tick:', timer);
        
        if (timer <= 0) {
            if (useServiceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ action: 'stop' });
            }
            isRunning = false;
            notifySessionEnd();
            
            // Auto-switch to break after focus session ends
            if (isFocusSession) {
                isFocusSession = false; // Switch to break session when timer ends
                timer = breakTime; // Set timer to break time
                updateTimerDisplay();
            }
            
            startPauseButton.textContent = "Start"; // Reset button to "Start" when timer ends
        }
        updateTimerDisplay();
    }

    // Attach service worker message listener (only once)
    function attachServiceWorkerListener() {
        if (messageListener) {
            navigator.serviceWorker.removeEventListener('message', messageListener);
        }
        
        messageListener = (event) => {
            console.log('Received message from service worker:', event.data);
            if (event.data.timer !== undefined) {
                timer = event.data.timer;
                updateTimerDisplay();
            }
            if (event.data.isRunning !== undefined) {
                isRunning = event.data.isRunning;
                startPauseButton.textContent = isRunning ? "Pause" : "Start";
                
                // If timer stops and reaches zero, check if we should notify
                if (!isRunning && timer <= 0) {
                    notifySessionEnd();
                }
            }
        };
        
        navigator.serviceWorker.addEventListener('message', messageListener);
    }

    // Start the timer using Service Worker or local setInterval
    function startTimer() {
        console.log('Starting timer, isRunning:', isRunning, 'timer:', timer);
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
            } else {
                // Fallback: Use local setInterval
                clearInterval(interval); // Ensure no previous interval is running
                interval = setInterval(() => handleTick(), intervalMs);
            }
            isRunning = true;
            startPauseButton.textContent = "Pause"; // Update button to "Pause"
            // Immediately update sessionLabel when starting/resuming
            if (timer > 0) {
                sessionLabel.textContent = isFocusSession ? "Focus Session" : "Break Time";
            } else {
                sessionLabel.textContent = "Break Time";
            }
        }
    }

    // Stop (pause) the timer
    function stopTimer() {
        console.log('Stopping timer, isRunning:', isRunning, 'timer:', timer);
        if (isRunning) {
            if (useServiceWorker && navigator.serviceWorker.controller) {
                console.log('Sending stop message to service worker');
                navigator.serviceWorker.controller.postMessage({ action: 'stop' });
            }
            if (interval) {
                clearInterval(interval); // Clear local interval
            }
            isRunning = false;
            startPauseButton.textContent = "Start"; // Update button to "Start"
        }
    }

    // Reset timer to the current session type's initial time and stop it
    function resetTimer() {
        console.log('Resetting timer');
        stopTimer();
        timer = isFocusSession ? workTime : breakTime;
        lastTickTime = Date.now();
        updateTimerDisplay();
        if (useServiceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ action: 'reset', initialTime: timer });
        }
    }

    // Toggle between focus and break sessions
    function toggleSession() {
        console.log('Toggling session type');
        stopTimer(); // Stop the current timer
        isFocusSession = !isFocusSession; // Toggle session type
        timer = isFocusSession ? workTime : breakTime; // Set appropriate time
        updateTimerDisplay();
        
        // Notify the service worker about the reset with new timer value
        if (useServiceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                action: 'reset',
                initialTime: timer
            });
        }
    }

    // Notification for session end
    function notifySessionEnd() {
        const message = isFocusSession ? "Focus session complete! Time for a break." : "Break time is over! Ready to focus?";
        
        // Check if browser supports notifications and permission is granted
        if ('Notification' in window) {
            if (Notification.permission === "granted") {
                new Notification("Pomodoro Timer", { body: message });
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        new Notification("Pomodoro Timer", { body: message });
                    }
                });
            }
        }
        
        // Also log to console for debugging
        console.log(message);
    }

    // Save session state to localStorage
    function saveState() {
        const state = {
            timer,
            isRunning,
            isFocusSession,
            lastTickTime: Date.now() // Always use current time when saving
        };
        localStorage.setItem('pomodoroState', JSON.stringify(state));
        console.log('Saved state:', state);
    }

    // Load session state from localStorage
    function loadState() {
        try {
            const savedState = localStorage.getItem('pomodoroState');
            if (savedState) {
                const state = JSON.parse(savedState);
                console.log('Loaded state:', state);
                
                // Only restore non-running state to avoid timing issues
                timer = state.timer;
                isFocusSession = state.isFocusSession;
                // Don't restore isRunning - always start paused
                isRunning = false;
                
                updateTimerDisplay();
                return true;
            }
        } catch (e) {
            console.error('Error loading saved state:', e);
        }
        return false;
    }

    // Handle tab visibility changes
    document.addEventListener('visibilitychange', () => {
        console.log('Tab visibility changed, isVisible:', !document.hidden, 'isRunning:', isRunning);
        // Save state when leaving the page
        if (document.hidden) {
            saveState();
        }
    });

    // Toggle Start/Pause on button click
    startPauseButton.addEventListener('click', function() {
        console.log('Start/Pause button clicked, isRunning:', isRunning);
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

    // Add toggle session button handler if button exists
    if (toggleSessionButton) {
        toggleSessionButton.addEventListener('click', function() {
            toggleSession();
        });
    }

    // Before closing or refreshing the page, save the current state
    window.addEventListener('beforeunload', () => {
        saveState();
    });

    // Register and sync with service worker if available
    if (useServiceWorker) {
        navigator.serviceWorker.register('serviceWorker.js').then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
            // Attach message listener after successful registration
            if (navigator.serviceWorker.controller) {
                attachServiceWorkerListener();
            } else {
                // If controller is not available yet, listen for controllerchange
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    console.log('Service Worker now controlling the page');
                    attachServiceWorkerListener();
                });
            }
        }).catch(error => {
            console.error('Service Worker registration failed:', error);
        });
    }

    // Initialize: Try to load saved state, or start fresh
    if (!loadState()) {
        updateTimerDisplay();
    }
    
    startPauseButton.textContent = "Start"; // Ensure button starts as "Start"
});