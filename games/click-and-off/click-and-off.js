// DOM elements
const gameArea = document.getElementById('gameArea');
const scoreDisplay = document.getElementById('score');
const brokenLightsDisplay = document.getElementById('brokenLights');
const missedLightsDisplay = document.getElementById('missedLights');
const timerDisplay = document.getElementById('timer');
const gameStatusMessage = document.getElementById('gameStatusMessage');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const allLights = document.querySelectorAll('.light');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const overlayMessage = document.getElementById('overlayMessage');

// Game variables
let score = 0;
let brokenLightsCount = 0;
let MAX_BROKEN_LIGHTS_CURRENT = 3; // Dynamic max broken lights
let missedLightsCount = 0;
let MAX_MISSED_LIGHTS_CURRENT = 12; // Dynamic max missed lights

let timeLeft = 66; // Game duration in seconds
let gameInterval; // Interval for the main game timer
let lightActivationInterval; // Interval for activating new lights
const lightTimeouts = new Map(); // Map to store timeouts for active lights: lightId -> timeoutId

const lightColors = ['color-1', 'color-2', 'color-3', 'color-4']; // CSS classes for light colors
const RAINBOW_LIGHT_PROBABILITY = 0.005; // 0.5% probability for rainbow light
const BLACK_LIGHT_PROBABILITY = 0.008; // 0.8% probability for black light (slightly higher)

// Difficulty settings (intermediate but slightly easy)
const LIGHT_APPEAR_INTERVAL_MIN = 1200; // Minimum time between new lights appearing (ms)
const LIGHT_APPEAR_INTERVAL_MAX = 2200; // Maximum time between new lights appearing (ms)
const LIGHT_LIFETIME_MIN = 2000; // Minimum time a light stays on screen (ms)
const LIGHT_LIFETIME_MAX = 3500; // Maximum time a light stays on screen (ms)

// New game mechanics variables
let extinguishedLightsCount = 0; // Tracks lights successfully clicked
let maxActiveLights = 1; // Initial number of lights that can be active simultaneously (starts with 1)
// Score thresholds to increase maxActiveLights (up to a maximum of 6 lights)
const SCORE_THRESHOLDS_FOR_MORE_LIGHTS = [
    50,  // 2 lights active when score >= 50
    125, // 3 lights active when score >= 125
    225, // 4 lights active when score >= 225
    400, // 5 lights active when score >= 400
    750  // 6 lights active when score >= 750
];
const RANDOM_ACTIVE_LIGHTS_SCORE = 1300; // New threshold for random mode
let currentThresholdIndex = 0;
let randomActiveLightsMode = false; // Flag to indicate if random mode is active

// Thresholds for increasing MAX_BROKEN_LIGHTS and MAX_MISSED_LIGHTS
const PENALTY_THRESHOLDS = [
    { score: 500, maxBroken: 5, maxMissed: 24 },
    { score: 1000, maxBroken: 9, maxMissed: 48 }
];
let currentPenaltyThresholdIndex = 0;


const TIME_BONUS_PER_HIT = 2; // Points added for each hit (changed from 3 to 1)
const SCORE_PENALTY_PER_BROKEN = 5; // Points deducted for each broken light (can go negative)
const TIME_PENALTY_PER_BROKEN = 4; // Seconds deducted for each broken light
const SCORE_PENALTY_PER_MISS = 1; // Points deducted for each miss
const TIME_PENALTY_PER_MISS = 1; // Seconds deducted for each miss

// Rainbow light specific bonuses/penalties
const RAINBOW_POINTS_BONUS = 10;
const RAINBOW_TIME_BONUS = 10;
const RAINBOW_BROKEN_LIGHTS_REDUCTION = 2; // Reduces broken lights count
const RAINBOW_MISSED_LIGHTS_REDUCTION = 3; // Reduces missed lights count
const RAINBOW_BROKEN_LIGHTS_RESTORE = 2; // Number of broken lights to restore

// Black light specific penalties
const BLACK_LIGHT_SCORE_PENALTY = 25;
const BLACK_LIGHT_TIME_PENALTY = 10;


let isGameRunning = false;

// --- Game Flow Functions ---

/**
 * Initializes and starts the game.
 */
function startGame() {
    score = 0;
    brokenLightsCount = 0;
    missedLightsCount = 0;
    timeLeft = 66; // Reset to 66 seconds
    extinguishedLightsCount = 0;
    maxActiveLights = 1; // Reset to initial: 1 light
    currentThresholdIndex = 0;
    MAX_BROKEN_LIGHTS_CURRENT = 3; // Reset dynamic max broken lights
    MAX_MISSED_LIGHTS_CURRENT = 12; // Reset dynamic max missed lights
    currentPenaltyThresholdIndex = 0; // Reset penalty threshold index
    randomActiveLightsMode = false; // Reset random mode flag

    scoreDisplay.textContent = score;
    brokenLightsDisplay.textContent = `${brokenLightsCount}/${MAX_BROKEN_LIGHTS_CURRENT}`;
    missedLightsDisplay.textContent = `${missedLightsCount}/${MAX_MISSED_LIGHTS_CURRENT}`;
    timerDisplay.textContent = timeLeft;
    gameStatusMessage.textContent = '¡Haz clic en las luces!';
    gameStatusMessage.classList.remove('success', 'error');

    // Hide game over overlay
    gameOverOverlay.classList.remove('visible');

    // Clear any existing timeouts from previous games
    lightTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    lightTimeouts.clear();

    // Reset all lights to their initial 'off' state and attach event listeners
    allLights.forEach(light => {
        light.classList.remove('on', 'broken', 'rainbow', 'black', ...lightColors); // Also remove black class
        light.style.pointerEvents = 'auto'; // Make them clickable
        // Remove existing listener to prevent duplicates, then add new one
        light.removeEventListener('click', handleLightClick);
        light.addEventListener('click', handleLightClick);
    });

    startButton.disabled = true;
    restartButton.disabled = false;
    isGameRunning = true;

    // Start game timer
    gameInterval = setInterval(updateTimer, 1000);

    // Start activating lights (initial call)
    scheduleNextLightActivation();
}

/**
 * Ends the game.
 * @param {string} message - The message to display at the end.
 * @param {boolean} isError - True if it's an error/loss condition.
 */
function endGame(message, isError = false) {
    isGameRunning = false;
    clearInterval(gameInterval);
    clearInterval(lightActivationInterval); // Stop scheduling new lights

    // Clear all pending light timeouts
    lightTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    lightTimeouts.clear();

    // Disable clicks on all lights
    allLights.forEach(light => {
        light.style.pointerEvents = 'none';
        // Ensure all 'on' lights are turned off visually
        if (light.classList.contains('on')) {
            light.classList.remove('on', 'rainbow', 'black', ...lightColors); // Also remove black class
        }
    });

    // Display game over overlay
    overlayMessage.textContent = message;
    gameOverOverlay.classList.add('visible');
    
    gameStatusMessage.classList.remove('success', 'error'); // Clear status message below game area
    
    startButton.disabled = false; // Allow starting a new game
    restartButton.disabled = true; // Disable restart until new game starts or is clicked
}

/**
 * Resets the game to its initial state.
 */
function resetGame() {
    // This function now primarily resets the UI and prepares for a new game
    // The actual "end" state (clearing intervals, etc.) is handled by endGame
    gameOverOverlay.classList.remove('visible'); // Hide overlay if visible

    score = 0;
    brokenLightsCount = 0;
    missedLightsCount = 0;
    timeLeft = 66; // Reset to 66 seconds
    extinguishedLightsCount = 0;
    maxActiveLights = 1; // Reset to initial: 1 light
    currentThresholdIndex = 0;
    MAX_BROKEN_LIGHTS_CURRENT = 3; // Reset dynamic max broken lights
    MAX_MISSED_LIGHTS_CURRENT = 12; // Reset dynamic max missed lights
    currentPenaltyThresholdIndex = 0;
    randomActiveLightsMode = false; // Reset random mode flag

    scoreDisplay.textContent = score;
    brokenLightsDisplay.textContent = `${brokenLightsCount}/${MAX_BROKEN_LIGHTS_CURRENT}`;
    missedLightsDisplay.textContent = `${missedLightsCount}/${MAX_MISSED_LIGHTS_CURRENT}`;
    timerDisplay.textContent = timeLeft;
    gameStatusMessage.textContent = 'Presiona "Iniciar Juego" para comenzar.';
    gameStatusMessage.classList.remove('success', 'error'); // Clear any status classes

    // Reset all lights to their initial 'off' state (no 'on', no 'broken')
    allLights.forEach(light => {
        light.classList.remove('on', 'broken', 'rainbow', 'black', ...lightColors); // Also remove black class
        light.style.pointerEvents = 'auto'; // Make them clickable for the next game
        light.removeEventListener('click', handleLightClick); // Ensure no duplicate listeners
        light.addEventListener('click', handleLightClick);
    });

    startButton.disabled = false; // Re-enable start button
    restartButton.disabled = true; // Keep restart disabled until game starts
    isGameRunning = false; // Ensure game is not running
    clearInterval(gameInterval); // Clear any lingering intervals
    clearInterval(lightActivationInterval);
    lightTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    lightTimeouts.clear();
}

/**
 * Updates the game timer.
 */
function updateTimer() {
    timeLeft--;
    timerDisplay.textContent = timeLeft;

    if (timeLeft <= 0) {
        endGame(`¡Tiempo agotado! Tu puntuación final: ${score}`, false); // Game over due to time
    }
}

// --- Light Management Functions ---

/**
 * Schedules the next random light activation.
 */
function scheduleNextLightActivation() {
    if (!isGameRunning) return;

    // Clear previous activation interval to avoid multiple activations at once
    clearTimeout(lightActivationInterval);

    const currentlyActiveLights = Array.from(allLights).filter(light => light.classList.contains('on'));
    let lightsToActivateThisCycle = 0;

    if (randomActiveLightsMode) {
        // In random mode, decide how many lights to activate randomly for this cycle
        lightsToActivateThisCycle = getRandomInt(1, 6); // Random max for this specific activation cycle
    } else {
        // Normal progression
        lightsToActivateThisCycle = maxActiveLights;
    }

    // Determine how many *more* lights we need to activate to reach the target for this cycle
    let lightsNeeded = lightsToActivateThisCycle - currentlyActiveLights.length;
    
    // Ensure we don't try to activate more lights than available (not on and not broken)
    const availableForActivation = Array.from(allLights).filter(light => 
        !light.classList.contains('on') && !light.classList.contains('broken')
    ).length;
    
    lightsNeeded = Math.min(lightsNeeded, availableForActivation);

    // Activate multiple lights simultaneously if needed
    for (let i = 0; i < lightsNeeded; i++) {
        activateRandomLight();
    }

    // Schedule the next batch of activations after a main interval
    const delay = getRandomInt(LIGHT_APPEAR_INTERVAL_MIN, LIGHT_APPEAR_INTERVAL_MAX);
    lightActivationInterval = setTimeout(scheduleNextLightActivation, delay);
}

/**
 * Activates a random available light.
 */
function activateRandomLight() {
    if (!isGameRunning) return;

    const availableLights = Array.from(allLights).filter(light => 
        !light.classList.contains('on') && !light.classList.contains('broken')
    );

    if (availableLights.length === 0) {
        // No lights available to turn on, try again later.
        // scheduleNextLightActivation will handle the re-check
        return;
    }

    const randomIndex = Math.floor(Math.random() * availableLights.length);
    const lightToActivate = availableLights[randomIndex];

    turnLightOn(lightToActivate);
}

/**
 * Turns a specific light on.
 * @param {HTMLElement} lightElement - The light's DOM element.
 */
function turnLightOn(lightElement) {
    const randomValue = Math.random();

    if (randomValue < RAINBOW_LIGHT_PROBABILITY) {
        lightElement.classList.add('on', 'rainbow');
    } else if (randomValue < RAINBOW_LIGHT_PROBABILITY + BLACK_LIGHT_PROBABILITY) {
        lightElement.classList.add('on', 'black'); // Add black class
    } else {
        const randomColorClass = lightColors[Math.floor(Math.random() * lightColors.length)];
        lightElement.classList.add('on', randomColorClass);
    }

    // Store timeout to turn off the light if not clicked
    const timeoutId = setTimeout(() => {
        turnLightOff(lightElement); // Light timed out
    }, getRandomInt(LIGHT_LIFETIME_MIN, LIGHT_LIFETIME_MAX));

    lightTimeouts.set(lightElement.dataset.lightId, timeoutId);
}

/**
 * Turns a specific light off (due to click or timeout).
 * @param {HTMLElement} lightElement - The light's DOM element.
 * @param {boolean} [wasClicked=false] - True if the light was clicked, false if it timed out.
 */
function turnLightOff(lightElement, wasClicked = false) {
    // Clear the timeout associated with this light
    if (lightTimeouts.has(lightElement.dataset.lightId)) {
        clearTimeout(lightTimeouts.get(lightElement.dataset.lightId));
        lightTimeouts.delete(lightElement.dataset.lightId);
    }

    lightElement.classList.remove('on', 'rainbow', 'black', ...lightColors); // Remove black class too
    
    if (!wasClicked && isGameRunning) { // If light timed out and game is still running
        score = score - SCORE_PENALTY_PER_MISS; // Deduct point (can go negative)
        scoreDisplay.textContent = score;
        timeLeft = Math.max(0, timeLeft - TIME_PENALTY_PER_MISS); // Deduct time
        timerDisplay.textContent = timeLeft;
        
        missedLightsCount++; // Incrementar contador de luces falladas
        missedLightsDisplay.textContent = `${missedLightsCount}/${MAX_MISSED_LIGHTS_CURRENT}`; // Actualizar display

        gameStatusMessage.textContent = '¡Se apagó una luz! -1 punto, -1s';
        gameStatusMessage.classList.add('error');
        setTimeout(() => {
            if (isGameRunning) gameStatusMessage.textContent = '¡Haz clic en las luces!';
            gameStatusMessage.classList.remove('error');
        }, 500);

        if (missedLightsCount >= MAX_MISSED_LIGHTS_CURRENT) { // Nueva condición de fin de juego
            endGame(`¡Has fallado ${MAX_MISSED_LIGHTS_CURRENT} luces! Juego Terminado. Puntuación final: ${score}`, true);
        } else if (timeLeft <= 0) { // Check if game ends due to time penalty
            endGame(`¡Tiempo agotado por luces no apagadas! Tu puntuación final: ${score}`, true);
        }
    }
}

/**
 * Restores a given number of broken lights to a playable (off) state.
 * @param {number} count - The number of broken lights to restore.
 */
function restoreBrokenLights(count) {
    const brokenLights = Array.from(allLights).filter(light => light.classList.contains('broken'));
    
    // Shuffle the broken lights array to pick random ones
    for (let i = brokenLights.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [brokenLights[i], brokenLights[j]] = [brokenLights[j], brokenLights[i]];
    }

    let lightsRestored = 0;
    for (let i = 0; i < brokenLights.length && lightsRestored < count; i++) {
        const light = brokenLights[i];
        light.classList.remove('broken');
        light.style.pointerEvents = 'auto'; // Make it clickable again
        lightsRestored++;
    }
    
    // Update the broken lights count
    brokenLightsCount = Math.max(0, brokenLightsCount - lightsRestored);
    brokenLightsDisplay.textContent = `${brokenLightsCount}/${MAX_BROKEN_LIGHTS_CURRENT}`;
}


/**
 * Handles a click on a light.
 * @param {Event} event - The click event.
 */
function handleLightClick(event) {
    if (!isGameRunning) return;

    const clickedLight = event.target;

    if (clickedLight.classList.contains('on')) {
        // Light was ON, player clicked correctly
        let pointsEarned = 0;
        let timeEarned = 0;

        if (clickedLight.classList.contains('rainbow')) {
            pointsEarned = RAINBOW_POINTS_BONUS;
            timeEarned = RAINBOW_TIME_BONUS;
            
            // Reduce broken lights count
            brokenLightsCount = Math.max(0, brokenLightsCount - RAINBOW_BROKEN_LIGHTS_REDUCTION);
            brokenLightsDisplay.textContent = `${brokenLightsCount}/${MAX_BROKEN_LIGHTS_CURRENT}`;

            // Reduce missed lights count
            missedLightsCount = Math.max(0, missedLightsCount - RAINBOW_MISSED_LIGHTS_REDUCTION);
            missedLightsDisplay.textContent = `${missedLightsCount}/${MAX_MISSED_LIGHTS_CURRENT}`;

            // Restore broken lights visually
            restoreBrokenLights(RAINBOW_BROKEN_LIGHTS_RESTORE);

            gameStatusMessage.textContent = `¡Luz Arcoíris! +${pointsEarned} puntos, +${timeEarned}s, -${RAINBOW_BROKEN_LIGHTS_REDUCTION} rotas, -${RAINBOW_MISSED_LIGHTS_REDUCTION} falladas.`;
        } else if (clickedLight.classList.contains('black')) { // Handle black light click
            pointsEarned = -BLACK_LIGHT_SCORE_PENALTY; // Deduct points
            timeEarned = -BLACK_LIGHT_TIME_PENALTY; // Deduct time
            gameStatusMessage.textContent = `¡Luz Negra! -${BLACK_LIGHT_SCORE_PENALTY} puntos, -${BLACK_LIGHT_TIME_PENALTY}s.`;
        }
        else {
            pointsEarned = TIME_BONUS_PER_HIT; // Use the constant for regular lights
            timeEarned = TIME_BONUS_PER_HIT;
            gameStatusMessage.textContent = '¡Bien!';
        }
        
        score += pointsEarned;
        scoreDisplay.textContent = score;
        extinguishedLightsCount++; // Increment extinguished lights count
        timeLeft = Math.min(66, timeLeft + timeEarned); // Add time, cap at 66s
        timerDisplay.textContent = timeLeft;

        // Display status message based on light type
        if (clickedLight.classList.contains('black')) {
            gameStatusMessage.classList.add('error'); // Error for black light
        } else {
            gameStatusMessage.classList.add('success');
        }
        setTimeout(() => {
            if (isGameRunning) gameStatusMessage.textContent = '¡Haz clic en las luces!';
            gameStatusMessage.classList.remove('success', 'error');
        }, 500); // Shorter duration for regular hits, longer for rainbow/black

        // Check if we need to enter random active lights mode
        if (!randomActiveLightsMode && score >= RANDOM_ACTIVE_LIGHTS_SCORE) {
            randomActiveLightsMode = true;
            // No need to set maxActiveLights here, scheduleNextLightActivation will handle it
            gameStatusMessage.textContent = `¡Modo aleatorio activado! El número de luces variará.`;
            gameStatusMessage.classList.add('success');
            setTimeout(() => {
                if (isGameRunning) gameStatusMessage.textContent = '¡Haz clic en las luces!';
                gameStatusMessage.classList.remove('success');
            }, 1500); // Longer message for this significant change
        } 
        // Check if we need to increase maxActiveLights (only if not in random mode)
        else if (!randomActiveLightsMode && maxActiveLights < 6 && currentThresholdIndex < SCORE_THRESHOLDS_FOR_MORE_LIGHTS.length && 
            score >= SCORE_THRESHOLDS_FOR_MORE_LIGHTS[currentThresholdIndex]) {
            maxActiveLights++;
            currentThresholdIndex++;
            gameStatusMessage.textContent = `¡Más luces! Ahora ${maxActiveLights} activas.`;
            gameStatusMessage.classList.add('success');
            setTimeout(() => {
                if (isGameRunning) gameStatusMessage.textContent = '¡Haz clic en las luces!';
                gameStatusMessage.classList.remove('success');
            }, 1000);
        }
        
        turnLightOff(clickedLight, true); // Turn off and mark as clicked

        // Check for penalty threshold increase AFTER score update
        if (currentPenaltyThresholdIndex < PENALTY_THRESHOLDS.length && 
            score >= PENALTY_THRESHOLDS[currentPenaltyThresholdIndex].score) {
            
            MAX_BROKEN_LIGHTS_CURRENT = PENALTY_THRESHOLDS[currentPenaltyThresholdIndex].maxBroken;
            MAX_MISSED_LIGHTS_CURRENT = PENALTY_THRESHOLDS[currentPenaltyThresholdIndex].maxMissed;
            currentPenaltyThresholdIndex++;

            brokenLightsDisplay.textContent = `${brokenLightsCount}/${MAX_BROKEN_LIGHTS_CURRENT}`;
            missedLightsDisplay.textContent = `${missedLightsCount}/${MAX_MISSED_LIGHTS_CURRENT}`;

            gameStatusMessage.textContent = `¡Dificultad de penalización aumentada!`;
            gameStatusMessage.classList.add('success');
            setTimeout(() => {
                if (isGameRunning) gameStatusMessage.textContent = '¡Haz clic en las luces!';
                gameStatusMessage.classList.remove('success');
            }, 1000);
        }

        // Check for game over conditions after applying penalties/bonuses
        if (timeLeft <= 0) {
            endGame(`¡Tiempo agotado! Tu puntuación final: ${score}`, true); // Game over due to time
        }
        
    } else if (!clickedLight.classList.contains('broken')) {
        // Light was OFF and not already broken, player clicked incorrectly
        brokenLightsCount++;
        brokenLightsDisplay.textContent = `${brokenLightsCount}/${MAX_BROKEN_LIGHTS_CURRENT}`; // Update display
        score = score - SCORE_PENALTY_PER_BROKEN; // Deduct point (can go negative)
        scoreDisplay.textContent = score;
        timeLeft = Math.max(0, timeLeft - TIME_PENALTY_PER_BROKEN); // Deduct time, ensure not negative
        timerDisplay.textContent = timeLeft;

        clickedLight.classList.add('broken');
        clickedLight.style.pointerEvents = 'none'; // Make broken light unclickable

        gameStatusMessage.textContent = `¡Luz rota! ${brokenLightsCount}/${MAX_BROKEN_LIGHTS_CURRENT}`;
        gameStatusMessage.classList.add('error');
        setTimeout(() => {
            if (isGameRunning) gameStatusMessage.textContent = '¡Haz clic en las luces!';
            gameStatusMessage.classList.remove('error');
        }, 1000); // Keep error message a bit longer for broken lights

        if (brokenLightsCount >= MAX_BROKEN_LIGHTS_CURRENT) {
            endGame(`¡Has roto ${MAX_BROKEN_LIGHTS_CURRENT} luces! Juego Terminado. Puntuación final: ${score}`, true);
        } else if (timeLeft <= 0) { // Check if game ends due to time penalty
            endGame(`¡Tiempo agotado por penalización! Tu puntuación final: ${score}`, true);
        }
    }
}

/**
 * Generates a random integer between min (inclusive) and max (inclusive).
 * @param {number} min - The minimum value.
 * @param {number} max - The maximum value.
 * @returns {number} A random integer.
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- Event Listeners ---
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', resetGame);

// Initial setup
resetGame();
