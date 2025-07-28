// DOM elements
const gameBoard = document.getElementById('gameBoard');
const cells = document.querySelectorAll('.cell');
const gameStatus = document.getElementById('gameStatus');
const restartBtn = document.getElementById('restartBtn');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');
const backgroundParticles = document.querySelectorAll('.particle'); // Obtener todas las partículas de fondo

// Game variables
let board = ['', '', '', '', '', '', '', '', '']; // Board representation
let currentPlayer = 'X'; // Human player is always 'X'
let isGameActive = false; // Indicates if the game is in progress
let difficulty = 'easy'; // Default AI difficulty
const playerSymbol = 'X';
const aiSymbol = 'O';

// Winning combinations (board indices)
const winningConditions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

// --- Funciones de inicialización y manejo de la UI ---

/**
 * Inicializa el juego al cargar la página o al reiniciar.
 */
function initializeGame() {
    board = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X'; // Human player always starts
    isGameActive = false; // Game is not active until difficulty is chosen
    gameStatus.textContent = '¡Elige una dificultad para empezar!';
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('x', 'o', 'win');
        // Re-add event listener, ensuring it's only once per cell per game
        cell.removeEventListener('click', handleCellClick); // Remove existing to prevent multiple listeners
        cell.addEventListener('click', handleCellClick, { once: true });
        cell.style.pointerEvents = 'none'; // Disable cell clicks until difficulty is selected
    });

    // Make restart button visible but disabled initially
    restartBtn.disabled = true;
    // The CSS handles the visual state (opacity, cursor) for disabled buttons

    // Re-enable difficulty selection buttons
    difficultyButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.disabled = false;
        // The CSS handles the cursor for enabled buttons
    });
}

/**
 * Handles difficulty selection.
 * @param {Event} event - The click event.
 */
function handleDifficultySelection(event) {
    // Deactivate all difficulty buttons visually and functionally
    difficultyButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.disabled = true; // Disable buttons
        // The CSS handles the cursor for disabled buttons
    });
    // Activate the clicked button visually
    event.target.classList.add('active');
    
    difficulty = event.target.dataset.difficulty;
    gameStatus.textContent = `¡Juega! Eres ${playerSymbol}.`;
    isGameActive = true;
    cells.forEach(cell => cell.style.pointerEvents = 'auto'); // Enable cell clicks

    // Enable restart button once difficulty is chosen
    restartBtn.disabled = false;
    // The CSS handles the cursor for enabled buttons
}

/**
 * Displays the current game status.
 * @param {string} message - The message to display.
 */
function displayStatus(message) {
    gameStatus.textContent = message;
}

// --- Lógica del juego ---

/**
 * Handles a click on a board cell.
 * @param {Event} event - The click event.
 */
function handleCellClick(event) {
    const clickedCell = event.target;
    const clickedCellIndex = parseInt(clickedCell.dataset.cellIndex);

    // If the cell is already occupied or the game is not active, do nothing
    if (board[clickedCellIndex] !== '' || !isGameActive) {
        return;
    }

    // Perform player's move
    makeMove(clickedCell, clickedCellIndex, playerSymbol);

    // Check game status after player's move
    checkGameStatus();

    // If the game is still active, it's AI's turn
    if (isGameActive) {
        // Disable player clicks during AI turn
        cells.forEach(cell => cell.style.pointerEvents = 'none');
        setTimeout(() => {
            makeAIMove();
            // Re-enable player clicks after AI turn if game is still active
            if (isGameActive) {
                cells.forEach(cell => {
                    if (board[parseInt(cell.dataset.cellIndex)] === '') {
                        cell.style.pointerEvents = 'auto';
                    }
                });
            }
        }, 700); // Small delay for AI to "think"
    }
}

/**
 * Performs a move on the board.
 * @param {HTMLElement} cellElement - The DOM element of the cell.
 * @param {number} index - The index of the cell in the board array.
 * @param {string} symbol - The player's symbol ('X' or 'O').
 */
function makeMove(cellElement, index, symbol) {
    board[index] = symbol;
    cellElement.textContent = symbol;
    cellElement.classList.add(symbol.toLowerCase()); // Add 'x' or 'o' class for styling
}

/**
 * Checks for a winner or a draw.
 */
function checkGameStatus() {
    let roundWon = false;
    let winningCells = [];

    for (let i = 0; i < winningConditions.length; i++) {
        const winCondition = winningConditions[i];
        let a = board[winCondition[0]];
        let b = board[winCondition[1]];
        let c = board[winCondition[2]];

        if (a === '' || b === '' || c === '') {
            continue; // If any cell is empty, it's not a winning condition
        }
        if (a === b && b === c) {
            roundWon = true;
            winningCells = winCondition;
            break;
        }
    }

    if (roundWon) {
        isGameActive = false;
        displayStatus(`¡${currentPlayer} ha ganado!`);
        highlightWinningCells(winningCells);
        cells.forEach(cell => cell.style.pointerEvents = 'none'); // Disable all cell clicks
        return;
    }

    // Check for draw (if no winner and no empty cells left)
    if (!board.includes('')) {
        isGameActive = false;
        displayStatus('¡Es un empate!');
        cells.forEach(cell => cell.style.pointerEvents = 'none'); // Disable all cell clicks
        return;
    }

    // Switch turns if the game is still active
    currentPlayer = currentPlayer === playerSymbol ? aiSymbol : playerSymbol;
    if (isGameActive) {
        displayStatus(`Es el turno de ${currentPlayer}`);
    }
}

/**
 * Highlights the cells that form the winning combination.
 * @param {Array<number>} cellsToHighlight - Array of indices of the winning cells.
 */
function highlightWinningCells(cellsToHighlight) {
    cellsToHighlight.forEach(index => {
        cells[index].classList.add('win');
    });
}

// --- Lógica de la IA ---

/**
 * Realiza el movimiento de la IA según la dificultad seleccionada.
 */
function makeAIMove() {
    if (!isGameActive) return;

    let moveIndex = -1;
    switch (difficulty) {
        case 'easy':
            moveIndex = getEasyAIMove();
            break;
        case 'intermediate':
            moveIndex = getIntermediateAIMove();
            break;
        case 'difficult':
            moveIndex = getDifficultAIMove();
            break;
    }

    if (moveIndex !== -1) {
        makeMove(cells[moveIndex], moveIndex, aiSymbol);
        checkGameStatus();
    }
}

/**
 * Easy AI: Plays quite poorly, mostly random, with a small chance to block.
 * @returns {number} The index of the chosen cell.
 */
function getEasyAIMove() {
    const availableCells = board.map((cell, index) => cell === '' ? index : -1).filter(index => index !== -1);

    // 1. Very small chance (20%) to block an immediate player win
    if (Math.random() < 0.2) { // 20% chance to try and block
        const blockMove = findWinningMove(playerSymbol);
        if (blockMove !== -1) {
            return blockMove;
        }
    }

    // 2. Otherwise, pick a random available cell
    if (availableCells.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableCells.length);
        return availableCells[randomIndex];
    }
    return -1; // No available moves
}

/**
 * Intermediate AI: Plays like an average player, sometimes makes optimal moves, sometimes makes mistakes.
 * @returns {number} The index of the chosen cell.
 */
function getIntermediateAIMove() {
    // 1. Moderate chance (60%) to play optimally (win or block)
    if (Math.random() < 0.6) { // 60% chance to try and play smart
        // Try to win
        let bestMove = findWinningMove(aiSymbol);
        if (bestMove !== -1) return bestMove;

        // Try to block player
        bestMove = findWinningMove(playerSymbol);
        if (bestMove !== -1) return bestMove;

        // Take center if available
        if (board[4] === '') return 4;

        // Take a corner if available (common good move)
        const corners = [0, 2, 6, 8].filter(index => board[index] === '');
        if (corners.length > 0) {
            return corners[Math.floor(Math.random() * corners.length)];
        }
        // Take a side if available
        const sides = [1, 3, 5, 7].filter(index => board[index] === '');
        if (sides.length > 0) {
            return sides[Math.floor(Math.random() * sides.length)];
        }
    }

    // 2. Otherwise (40% chance), make a random move (mistake)
    return getEasyAIMove(); // Use easy AI's random logic
}


/**
 * Searches for a winning move for a given symbol.
 * @param {string} symbol - The player's symbol ('X' or 'O').
 * @returns {number} The index of the winning cell, or -1 if none.
 */
function findWinningMove(symbol) {
    for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        const line = [board[a], board[b], board[c]];

        // Count how many cells are occupied by the symbol and how many are empty
        const symbolCount = line.filter(cell => cell === symbol).length;
        const emptyCount = line.filter(cell => cell === '').length;

        if (symbolCount === 2 && emptyCount === 1) {
            // Find the empty cell in that line
            if (board[a] === '') return a;
            if (board[b] === '') return b;
            if (board[c] === '') return c;
        }
    }
    return -1; // No winning move found
}

/**
 * Difficult AI: Implements the Minimax algorithm to play optimally.
 * @returns {number} The index of the best move.
 */
function getDifficultAIMove() {
    let bestScore = -Infinity;
    let bestMove = -1;

    // Iterar sobre todas las celdas vacías
    for (let i = 0; i < board.length; i++) {
        if (board[i] === '') {
            // Hacer el movimiento
            board[i] = aiSymbol;
            // Calcular el score para este movimiento (asumiendo que el jugador minimiza)
            let score = minimax(board, 0, false); // false = es el turno del jugador (minimizing player)
            // Deshacer el movimiento
            board[i] = '';

            // Si este score es mejor que el mejor score actual, actualizar
            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }
    return bestMove;
}

/**
 * Algoritmo Minimax para determinar el mejor movimiento.
 * @param {Array<string>} currentBoard - El estado actual del tablero.
 * @param {number} depth - La profundidad del árbol de búsqueda.
 * @param {boolean} isMaximizingPlayer - True si es el turno del jugador maximizador (IA), false si es el minimizador (jugador).
 * @returns {number} La puntuación del estado actual del tablero.
 */
function minimax(currentBoard, depth, isMaximizingPlayer) {
    // Evaluar el estado actual del tablero
    let score = evaluateBoard(currentBoard);

    // Si el juego ha terminado (ganador o empate) o se ha alcanzado una profundidad máxima, devolver el score
    if (score !== 0 || !currentBoard.includes('')) {
        // Ajustar score para favorecer victorias rápidas y evitar derrotas tardías
        if (score === 10) return score - depth; // IA gana, mejor cuanto antes
        if (score === -10) return score + depth; // Jugador gana, peor cuanto antes
        return score; // Empate o juego en curso
    }

    if (isMaximizingPlayer) { // Turno de la IA (Maximizar)
        let bestScore = -Infinity;
        for (let i = 0; i < currentBoard.length; i++) {
            if (currentBoard[i] === '') {
                currentBoard[i] = aiSymbol;
                bestScore = Math.max(bestScore, minimax(currentBoard, depth + 1, false));
                currentBoard[i] = ''; // Deshacer movimiento
            }
        }
        return bestScore;
    } else { // Turno del jugador (Minimizar)
        let bestScore = Infinity;
        for (let i = 0; i < currentBoard.length; i++) {
            if (currentBoard[i] === '') {
                currentBoard[i] = playerSymbol;
                bestScore = Math.min(bestScore, minimax(currentBoard, depth + 1, true));
                currentBoard[i] = ''; // Deshacer movimiento
            }
        }
        return bestScore;
    }
}

/**
 * Evalúa el estado actual del tablero para el algoritmo Minimax.
 * @param {Array<string>} board - El tablero a evaluar.
 * @returns {number} 10 si la IA gana, -10 si el jugador gana, 0 si empate o juego en curso.
 */
function evaluateBoard(board) {
    for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (board[a] === board[b] && board[b] === board[c]) {
            if (board[a] === aiSymbol) {
                return 10; // IA gana
            } else if (board[a] === playerSymbol) {
                return -10; // Jugador gana
            }
        }
    }
    return 0; // Empate o juego en curso
}

// --- Lógica para la animación de partículas super-rápidas (JavaScript) ---

const SUPER_FAST_PROBABILITY = 0.000001; // 0.0001% = 0.000001
const SUPER_FAST_DURATION = 2000; // 2 segundos en milisegundos

/**
 * Activa una animación super-rápida en una partícula aleatoria.
 */
function triggerSuperFastParticle() {
    if (Math.random() < SUPER_FAST_PROBABILITY) {
        const randomIndex = Math.floor(Math.random() * backgroundParticles.length);
        const particle = backgroundParticles[randomIndex];

        // Guardar la animación original para restaurarla después
        const originalAnimation = particle.style.animation;

        // Aplicar la clase para la animación super-rápida
        particle.classList.add('super-fast');

        // Eliminar la clase después de la duración y restaurar la animación original
        setTimeout(() => {
            particle.classList.remove('super-fast');
            // Opcional: reiniciar la animación base si se detuvo con 'forwards'
            // particle.style.animation = originalAnimation;
            // Para asegurar que la animación base se reinicie correctamente,
            // a veces es mejor forzar un reflow o re-aplicar la animación base.
            // En este caso, como 'superFastMove' tiene 'forwards', puede que necesites
            // resetearla o re-aplicar la animación base si no se mezcla bien.
            // Para simplicidad, si 'superFastMove' es 'forwards', la partícula se quedará
            // en su estado final. Si quieres que vuelva a su animación normal,
            // necesitarías un manejo más complejo de las propiedades de animación.
            // Para este ejemplo, la partícula simplemente se detendrá en su posición final
            // de la animación rápida y luego volverá a su estado normal de opacidad.
            // Si quieres que siga moviéndose con la animación LENTA después,
            // tendrías que re-aplicar la animación base o resetearla.
            // Una forma simple es quitar la clase y luego añadirla de nuevo para que se reinicie
            // o simplemente dejar que la animación base se reanude si no fue sobrescrita completamente.
            // Para este caso, la animación base 'moveParticles' seguirá activa en el fondo.
            // La clase 'super-fast' sobrescribe temporalmente la animación.
            // Al quitarla, la animación base debería reanudarse.
        }, SUPER_FAST_DURATION);
    }
}

// Ejecutar la comprobación de la partícula super-rápida en un intervalo regular
// Un intervalo de 1 segundo (1000ms) significa que la probabilidad se evalúa cada segundo.
// Con una probabilidad de 0.000001, esto ocurrirá muy, muy raramente.
setInterval(triggerSuperFastParticle, 1000);


// --- Event Listeners ---
difficultyButtons.forEach(button => {
    button.addEventListener('click', handleDifficultySelection);
});

restartBtn.addEventListener('click', initializeGame);

// --- Game start ---
initializeGame();
