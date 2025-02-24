document.addEventListener('DOMContentLoaded', () => {
    const workTime = 25 * 60;  
    const breakTime = 5 * 60;  

    let timer = workTime; // initialize with work time
    let interval;
    let isWorkSession = true;
    let isRunning = false;
    let lastTickTime = Date.now(); // Track the last time the timer ticked

    // Reference DOM elements
    const timerDisplay = document.getElementById('timer');
    const startPauseButton = document.getElementById('startPause');
    const resetButton = document.getElementById('reset');
    const sessionLabel = document.getElementById('sessionLabel');

    // Update the displayed timer in mm:ss format
    function updateTimerDisplay() {
        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;
        timerDisplay.textContent = 
            `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
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
    }

    // Calculate elapsed time based on real time
    function calculateElapsedTime() {
        const now = Date.now();
        const elapsed = Math.floor((now - lastTickTime) / 1000); // Convert to seconds
        return elapsed;
    }

    // Decrease the timer based on elapsed time
    function tick() {
        if (timer > 0) {
            const elapsed = calculateElapsedTime();
            timer = Math.max(0, timer - elapsed); // Ensure timer doesn't go negative
            lastTickTime = Date.now(); // Update the last tick time
            updateTimerDisplay();
        } else {
            clearInterval(interval);
            switchSession();
            startInterval(); // Automatically start the next session
        }
    }

    // Start the interval timer
    function startInterval() {
        if (!isRunning) {
            lastTickTime = Date.now(); // Reset the last tick time
            interval = setInterval(tick, 1000); // Check every second
            isRunning = true;
            startPauseButton.textContent = "Pause";
        }
    }

    // Stop (pause) the interval timer
    function stopInterval() {
        clearInterval(interval);
        isRunning = false;
        startPauseButton.textContent = "Start";
    }

    // Handle tab visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Tab is hidden, pause the interval but keep track of time
            if (isRunning) {
                stopInterval();
                const elapsed = calculateElapsedTime();
                timer = Math.max(0, timer - elapsed); // Adjust timer for elapsed time
                updateTimerDisplay();
            }
        } else {
            // Tab is visible, resume or recalculate
            if (isRunning) {
                lastTickTime = Date.now(); // Reset the last tick time
                startInterval(); // Resume the interval
            }
        }
    });

    // Toggle Start/Pause on button click
    startPauseButton.addEventListener('click', function() {
        if (isRunning) {
            stopInterval();
        } else {
            startInterval();
        }
    });

    // Reset timer to the start of the current session
    resetButton.addEventListener('click', function() {
        stopInterval();
        timer = isWorkSession ? workTime : breakTime;
        lastTickTime = Date.now(); // Reset the last tick time
        updateTimerDisplay();
    });

    // Initialize the timer display
    updateTimerDisplay();
});