// Pomodoro Timer with Service Worker support and local storage
const useServiceWorker = 'serviceWorker' in navigator;

document.addEventListener('DOMContentLoaded', function() {
    // Configuration
    const workTime = 25 * 60;  // 25 minutes in seconds
    const breakTime = 5 * 60;   // 5 minutes in seconds

    // State variables
    let timer = workTime;
    let isRunning = false;
    let isFocusSession = true;
    let interval = null;
    let serviceWorkerReady = false;
    let messageListener = null;
    let hasStarted = false; // Track if timer has been used

    // DOM Elements
    const timerDisplay = document.getElementById('timer');
    const sessionLabel = document.getElementById('sessionLabel');
    const startPauseButton = document.getElementById('startPause');
    const resetButton = document.getElementById('reset');
    const toggleSessionButton = document.getElementById('toggleSession');

    // Make sure all elements exist
    if (!timerDisplay || !sessionLabel || !startPauseButton || !resetButton) {
        console.error('Required DOM elements are missing');
        return;
    }

    // Try to load saved state
    loadState();
    
    // Initialize the display
    updateDisplay();
    updateSessionLabel();
    
    // Register service worker if available
    if (useServiceWorker) {
        registerServiceWorker();
    }

    // Event listeners
    startPauseButton.addEventListener('click', function() {
        if (isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    });

    resetButton.addEventListener('click', resetTimer);

    if (toggleSessionButton) {
        toggleSessionButton.addEventListener('click', toggleSession);
    }

    // Timer functions
    function startTimer() {
        if (isRunning) return;
        
        // Update UI immediately
        isRunning = true;
        hasStarted = true;
        startPauseButton.textContent = "Pause";
        sessionLabel.textContent = isFocusSession ? "Focus Session" : "Break Time";
        
        if (useServiceWorker && serviceWorkerReady) {
            // Use service worker for background timing
            navigator.serviceWorker.controller.postMessage({
                action: 'start',
                initialTime: timer,
                interval: 1000
            });
        } else {
            // Fallback to local timing
            interval = setInterval(function() {
                if (timer > 0) {
                    timer--;
                    updateDisplay();
                    
                    if (timer === 0) {
                        completeTimer();
                    }
                }
            }, 1000);
        }
        
        // Save state
        saveState();
    }

    function pauseTimer() {
        if (!isRunning) return;
        
        // Update UI immediately
        isRunning = false;
        startPauseButton.textContent = "Start";
        sessionLabel.textContent = "Paused";
        
        if (useServiceWorker && serviceWorkerReady) {
            // Stop service worker timer
            navigator.serviceWorker.controller.postMessage({
                action: 'stop'
            });
        } else {
            // Stop local timer
            clearInterval(interval);
            interval = null;
        }
        
        // Save state
        saveState();
    }

    function resetTimer() {
        // Stop any running timer
        if (isRunning) {
            if (useServiceWorker && serviceWorkerReady) {
                navigator.serviceWorker.controller.postMessage({
                    action: 'stop'
                });
            } else {
                clearInterval(interval);
                interval = null;
            }
        }
        
        // Reset state
        isRunning = false;
        hasStarted = false;
        timer = isFocusSession ? workTime : breakTime;
        
        // Update UI
        startPauseButton.textContent = "Start";
        sessionLabel.textContent = isFocusSession ? "Focus Session" : "Break Time";
        updateDisplay();
        
        // Send reset to service worker if active
        if (useServiceWorker && serviceWorkerReady) {
            navigator.serviceWorker.controller.postMessage({
                action: 'reset',
                initialTime: timer
            });
        }
        
        // Save state
        saveState();
    }

    function completeTimer() {
        // Stop the timer
        if (useServiceWorker && serviceWorkerReady) {
            navigator.serviceWorker.controller.postMessage({
                action: 'stop'
            });
        } else {
            clearInterval(interval);
            interval = null;
        }
        
        isRunning = false;
        hasStarted = false;
        
        // Notification
        notifyUser();
        
        // Switch session type
        isFocusSession = !isFocusSession;
        timer = isFocusSession ? workTime : breakTime;
        
        // Update UI
        startPauseButton.textContent = "Start";
        sessionLabel.textContent = isFocusSession ? "Focus Session" : "Break Time";
        updateDisplay();
        
        // Save state
        saveState();
    }

    function toggleSession() {
        // Stop any running timer
        if (isRunning) {
            if (useServiceWorker && serviceWorkerReady) {
                navigator.serviceWorker.controller.postMessage({
                    action: 'stop'
                });
            } else {
                clearInterval(interval);
                interval = null;
            }
            isRunning = false;
        }
        
        // Reset hasStarted flag
        hasStarted = false;
        
        // Toggle session type
        isFocusSession = !isFocusSession;
        timer = isFocusSession ? workTime : breakTime;
        
        // Update UI
        startPauseButton.textContent = "Start";
        sessionLabel.textContent = isFocusSession ? "Focus Session" : "Break Time";
        updateDisplay();
        
        // Send reset to service worker if active
        if (useServiceWorker && serviceWorkerReady) {
            navigator.serviceWorker.controller.postMessage({
                action: 'reset',
                initialTime: timer
            });
        }
        
        // Save state
        saveState();
    }

    function updateDisplay() {
        // Format time as mm:ss
        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;
        const displayTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update DOM
        timerDisplay.textContent = displayTime;
        document.title = isFocusSession ? `Focus! - ${displayTime}` : `Break! - ${displayTime}`;
        
        // Update toggle button text
        if (toggleSessionButton) {
            toggleSessionButton.textContent = isFocusSession ? "Switch to Break" : "Switch to Focus";
        }
    }
    
    function updateSessionLabel() {
        if (isRunning) {
            sessionLabel.textContent = isFocusSession ? "Focus Session" : "Break Time";
        } else if (hasStarted) {
            sessionLabel.textContent = "Paused";
        } else {
            sessionLabel.textContent = isFocusSession ? "Focus Session" : "Break Time";
        }
    }

    function notifyUser() {
        if ('Notification' in window && Notification.permission === 'granted') {
            const message = isFocusSession 
                ? "Break time is over! Ready to focus?" 
                : "Focus session complete! Time for a break.";
            new Notification("Pomodoro Timer", { body: message });
        }
    }
    
    // Save timer state to localStorage
    function saveState() {
        try {
            const state = {
                timer: timer,
                isRunning: isRunning,
                isFocusSession: isFocusSession,
                hasStarted: hasStarted,
                lastSaved: Date.now()
            };
            localStorage.setItem('pomodoroState', JSON.stringify(state));
        } catch (err) {
            console.error('Error saving state:', err);
        }
    }
    
    // Load timer state from localStorage
    function loadState() {
        try {
            const savedState = localStorage.getItem('pomodoroState');
            if (savedState) {
                const state = JSON.parse(savedState);
                
                // Only restore if saved within last hour
                const oneHour = 60 * 60 * 1000;
                if (Date.now() - state.lastSaved < oneHour) {
                    timer = state.timer;
                    isFocusSession = state.isFocusSession;
                    hasStarted = state.hasStarted || false;
                    
                    // Always start paused when restoring
                    isRunning = false;
                    return true;
                }
            }
        } catch (err) {
            console.error('Error loading saved state:', err);
        }
        return false;
    }
    
    // Register and setup service worker
    function registerServiceWorker() {
        navigator.serviceWorker.register('serviceWorker.js').then(registration => {
            if (navigator.serviceWorker.controller) {
                serviceWorkerReady = true;
                setupServiceWorkerListener();
            } else {
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    serviceWorkerReady = true;
                    setupServiceWorkerListener();
                });
            }
        }).catch(error => {
            console.error('Service Worker registration failed:', error);
        });
    }
    
    // Setup listener for service worker messages
    function setupServiceWorkerListener() {
        if (messageListener) {
            navigator.serviceWorker.removeEventListener('message', messageListener);
        }
        
        messageListener = (event) => {
            // Update timer state from service worker
            if (event.data.timer !== undefined) {
                timer = event.data.timer;
                updateDisplay();
            }
            
            // Handle running state changes
            if (event.data.isRunning !== undefined) {
                isRunning = event.data.isRunning;
                startPauseButton.textContent = isRunning ? "Pause" : "Start";
                updateSessionLabel();
            }
            
            // Handle timer complete message
            if (event.data.timerComplete === true) {
                completeTimer();
            }
        };
        
        navigator.serviceWorker.addEventListener('message', messageListener);
    }
    
    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && serviceWorkerReady) {
            navigator.serviceWorker.controller.postMessage({ action: 'sync' });
        }
        
        // Save state when leaving page
        if (document.hidden) {
            saveState();
        }
    });
    
    // Before unloading the page, save state
    window.addEventListener('beforeunload', saveState);

    // Request notification permission
    if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
});