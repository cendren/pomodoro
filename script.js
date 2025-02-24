document.addEventListener('DOMContentLoaded', () => {
    // Your existing code goes here
    const workTime = 25 * 60;  
    const breakTime = 5 * 60;  

    let timer = workTime; // initialize with work time
    let interval;
    let isWorkSession = true;
    let isRunning = false;

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

    // Decrease the timer each second
    function tick() {
        if (timer > 0) {
            timer--;
            updateTimerDisplay();
        } else {
            clearInterval(interval);
            switchSession();
            startInterval(); // Automatically start the next session
        }
    }

    // Start the interval timer
    function startInterval() {
        interval = setInterval(tick, 1000);
        isRunning = true;
        startPauseButton.textContent = "Pause";
    }

    // Stop (pause) the interval timer
    function stopInterval() {
        clearInterval(interval);
        isRunning = false;
        startPauseButton.textContent = "Start";
    }

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
        updateTimerDisplay();
    });
});