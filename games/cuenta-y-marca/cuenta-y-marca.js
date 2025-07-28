// DOM elements
const objectsDisplay = document.getElementById('objectsDisplay');
const countCircleInput = document.getElementById('countCircle');
const countSquareInput = document.getElementById('countSquare');
const countTriangleInput = document.getElementById('countTriangle');
const checkButton = document.getElementById('checkButton');
const newRoundButton = document.getElementById('newRoundButton');
const gameStatus = document.getElementById('gameStatus');

// Game variables
let currentObjectCounts = {
    circle: 0,
    square: 0,
    triangle: 0
};
const maxObjectsPerType = 15; // Maximum number of each object type
const minObjectsPerType = 3;  // Minimum number of each object type

// --- Initialization and Game Flow ---

/**
 * Initializes a new round of the game.
 */
function startNewRound() {
    resetInputs();
    generateObjects();
    gameStatus.textContent = '¡Cuenta los objetos y escribe la cantidad!';
    gameStatus.classList.remove('success', 'error');
    checkButton.disabled = false; // Enable check button for new round
    newRoundButton.textContent = 'Nueva Ronda'; // Ensure button text is correct
}

/**
 * Resets input fields to 0.
 */
function resetInputs() {
    countCircleInput.value = 0;
    countSquareInput.value = 0;
    countTriangleInput.value = 0;
}

/**
 * Generates random quantities of each object type and displays them.
 */
function generateObjects() {
    objectsDisplay.innerHTML = ''; // Clear previous objects

    currentObjectCounts.circle = getRandomInt(minObjectsPerType, maxObjectsPerType);
    currentObjectCounts.square = getRandomInt(minObjectsPerType, maxObjectsPerType);
    currentObjectCounts.triangle = getRandomInt(minObjectsPerType, maxObjectsPerType);

    const allObjects = [];
    for (let i = 0; i < currentObjectCounts.circle; i++) {
        allObjects.push('circle');
    }
    for (let i = 0; i < currentObjectCounts.square; i++) {
        allObjects.push('square');
    }
    for (let i = 0; i < currentObjectCounts.triangle; i++) {
        allObjects.push('triangle');
    }

    // Shuffle the array to display objects randomly
    shuffleArray(allObjects);

    // Create and append object elements
    allObjects.forEach(type => {
        const objectDiv = document.createElement('div');
        objectDiv.classList.add('object-item', type);
        objectsDisplay.appendChild(objectDiv);
    });
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

/**
 * Shuffles an array in place (Fisher-Yates algorithm).
 * @param {Array} array - The array to shuffle.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// --- Game Logic ---

/**
 * Checks the user's answers against the actual object counts.
 */
function checkAnswers() {
    const userCounts = {
        circle: parseInt(countCircleInput.value) || 0,
        square: parseInt(countSquareInput.value) || 0,
        triangle: parseInt(countTriangleInput.value) || 0
    };

    let correct = true;
    let message = '¡Incorrecto! Intenta de nuevo.';
    gameStatus.classList.remove('success', 'error');

    if (userCounts.circle === currentObjectCounts.circle &&
        userCounts.square === currentObjectCounts.square &&
        userCounts.triangle === currentObjectCounts.triangle) {
        
        correct = true;
        message = '¡Correcto! ¡Bien hecho!';
        gameStatus.classList.add('success');
        checkButton.disabled = true; // Disable check button after correct answer
        newRoundButton.textContent = 'Siguiente Ronda'; // Change button text
    } else {
        correct = false;
        gameStatus.classList.add('error');
    }

    gameStatus.textContent = message;
}

// --- Event Listeners ---
newRoundButton.addEventListener('click', startNewRound);
checkButton.addEventListener('click', checkAnswers);

// Initial game setup
startNewRound();
