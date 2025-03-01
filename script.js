// Simplified Pomodoro Timer
// This is a clean, simplified version without service worker complexity

document.addEventListener('DOMContentLoaded', function() {
    // Configuration
    const workTime = 25 * 60;  // 25 minutes in seconds
    const breakTime = 5 * 60;   // 5 minutes in seconds

    // State variables
    let timer = workTime;
    let isRunning = false;
    let isFocusSession = true;
    let interval = null;

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

    // Initialize the display
    updateDisplay();

    // Event listeners with direct actions
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

    // Timer functions with clear UI updates
    function startTimer() {
        if (isRunning) return;
        
        // Update UI immediately
        isRunning = true;
        startPauseButton.textContent = "Pause";
        sessionLabel.textContent = isFocusSession ? "Focus Session" : "Break Time";
        
        // Start the timer interval
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

    function pauseTimer() {
        if (!isRunning) return;
        
        // Update UI immediately
        isRunning = false;
        startPauseButton.textContent = "Start";
        sessionLabel.textContent = "Paused";
        
        // Stop the timer
        clearInterval(interval);
        interval = null;
    }

    function resetTimer() {
        // Stop any running timer
        if (isRunning) {
            clearInterval(interval);
            interval = null;
        }
        
        // Reset state
        isRunning = false;
        timer = isFocusSession ? workTime : breakTime;
        
        // Update UI
        startPauseButton.textContent = "Start";
        sessionLabel.textContent = isFocusSession ? "Focus Session" : "Break Time";
        updateDisplay();
    }

    function completeTimer() {
        // Stop the timer
        clearInterval(interval);
        interval = null;
        isRunning = false;
        
        // Notification
        notifyUser();
        
        // Switch session type
        isFocusSession = !isFocusSession;
        timer = isFocusSession ? workTime : breakTime;
        
        // Update UI
        startPauseButton.textContent = "Start";
        sessionLabel.textContent = isFocusSession ? "Focus Session" : "Break Time";
        updateDisplay();
    }

    function toggleSession() {
        // Stop any running timer
        if (isRunning) {
            clearInterval(interval);
            interval = null;
            isRunning = false;
        }
        
        // Toggle session type
        isFocusSession = !isFocusSession;
        timer = isFocusSession ? workTime : breakTime;
        
        // Update UI
        startPauseButton.textContent = "Start";
        sessionLabel.textContent = isFocusSession ? "Focus Session" : "Break Time";
        updateDisplay();
    }

    function updateDisplay() {
        // Format time as mm:ss
        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;
        const displayTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update DOM
        timerDisplay.textContent = displayTime;
        document.title = isFocusSession ? `Focus! - ${displayTime}` : `Break! - ${displayTime}`;
    }

    function notifyUser() {
        // Simple notification
        if ('Notification' in window && Notification.permission === 'granted') {
            const message = isFocusSession 
                ? "Break time is over! Ready to focus?" 
                : "Focus session complete! Time for a break.";
            new Notification("Pomodoro Timer", { body: message });
        }
    }

    // Request notification permission
    if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
});