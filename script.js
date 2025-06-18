// Supabase configuration
const supabaseUrl = 'https://svjcokhvmzivbmecjgoc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2amNva2h2bXppdmJtZWNqZ29jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NzAwNjIsImV4cCI6MjA2NTI0NjA2Mn0.pBE8xYDAzPPxT7v31H0Cp419tq3xuRZSdJ4B7JVZX0g';
let supabaseClient = null;

// Initialize Supabase client if available
if (typeof supabase !== 'undefined' && supabase.createClient) {
    try {
        supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    } catch (error) {
        console.log('Supabase not configured properly:', error);
    }
}

// Game variables
let countdown = 30;
let gameActive = false;
let timerInterval;
let score = 0;
let currentRound = 0;
let roundInterval;
let clickedTeamsThisRound = new Set();
let clickedButtonsThisRound = new Set(); // Track individual button clicks
let hasPlayedBefore = false;

// UI elements
const nameInput = document.getElementById('nameInput');
const startBtn = document.getElementById('startBtn');
const timeDisplay = document.getElementById('timeDisplay');
const scoreDisplay = document.getElementById('scoreDisplay');
const resultDiv = document.getElementById('result');
const finalScore = document.getElementById('finalScore');
const gameGrid = document.getElementById('game-grid');
const instructionOverlay = document.getElementById('instruction-overlay');
const startGameBtn = document.getElementById('start-game-btn');

// Background gradient colors for buttons
const backgroundColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7'];

// Random colors for trap teams (different from correct team colors)
const trapColors = ['#ff9999', '#99ccff', '#ffcc99', '#cc99ff', '#99ffcc', '#ffff99', '#ff99cc', '#99ffff', '#ccff99'];

// Team types configuration - using specific colors for correct teams
const teamTypes = [
    {
        name: 'Plattform',
        color: '#7ecdeb',
        isTrap: false
    },
    {
        name: 'Produkt',
        color: '#ffe090',
        isTrap: false
    },
    {
        name: 'Tilrettelegging',
        color: '#ba95cb',
        isTrap: false
    },
    {
        name: 'Subsystem',
        color: '#ffc08a',
        isTrap: false
    },
    {
        name: 'Database',
        color: null, // Will be assigned randomly
        isTrap: true
    },
    {
        name: 'Portefølje',
        color: null, // Will be assigned randomly
        isTrap: true
    },
    {
        name: 'Support',
        color: null, // Will be assigned randomly
        isTrap: true
    },
    {
        name: 'Smidig',
        color: null, // Will be assigned randomly
        isTrap: true
    },
    {
        name: 'Test',
        color: null, // Will be assigned randomly
        isTrap: true
    },
    {
        name: 'Juridisk',
        color: null, // Will be assigned randomly
        isTrap: true
    },
    {
        name: 'Ledelse',
        color: null, // Will be assigned randomly
        isTrap: true
    }
];

// Check if user has played before
function checkPlayedBefore() {
    return localStorage.getItem('teamTopologiesPlayed') === 'true';
}

// Mark that user has played
function markAsPlayed() {
    localStorage.setItem('teamTopologiesPlayed', 'true');
}

// Create the 3x8 button grid
function createGrid() {
    gameGrid.innerHTML = '';
    gameGrid.style.display = 'grid'; // Make sure it's visible
    
    for (let i = 0; i < 24; i++) {
        const button = document.createElement('button');
        button.className = 'grid-button';
        button.dataset.index = i;
        button.addEventListener('click', handleButtonClick);
        gameGrid.appendChild(button);
    }
    
    randomizeButtons();
}

// Randomize button contents with staggered timing
function randomizeButtons() {
    const buttons = document.querySelectorAll('.grid-button');
    clickedTeamsThisRound.clear();
    
    // Store which buttons were clicked for this round before we clear the tracking
    const clickedButtons = new Set(clickedButtonsThisRound);
    
    buttons.forEach(button => {
        const buttonIndex = button.dataset.index;
        const wasClicked = clickedButtons.has(buttonIndex);
        
        // Random delay between 0.1 and 2.0 seconds
        let delay = Math.random() * 1.9 + 0.1; // 0.1 to 2.0 seconds
        
        // Add extra 500ms delay for clicked buttons
        if (wasClicked) {
            delay += 0.5;
        }
        
        // Schedule this button to update after the delay
        updateButtonWithDelay(button, delay * 1000); // Convert to milliseconds
    });
    
    // Clear clicked buttons tracking after all updates are scheduled
    clickedButtonsThisRound.clear();
}

// Update individual button with delay and transition
function updateButtonWithDelay(button, delay) {
    setTimeout(() => {
        // Hide the button first
        button.classList.add('hidden');
        
        // After 500ms, update content and show button
        setTimeout(() => {
            const randomTeam = teamTypes[Math.floor(Math.random() * teamTypes.length)];
            button.textContent = randomTeam.name;
            
            // Assign colors: fixed colors for correct teams, random colors for trap teams
            let buttonColor;
            if (randomTeam.isTrap) {
                // Assign random color from trapColors array
                buttonColor = trapColors[Math.floor(Math.random() * trapColors.length)];
            } else {
                // Use the defined color for correct teams
                buttonColor = randomTeam.color;
            }
            
            button.style.background = buttonColor;
            button.style.color = '#000'; // Always use black text for readability
            button.dataset.teamName = randomTeam.name;
            button.dataset.isTrap = randomTeam.isTrap;
            button.disabled = false;
            button.classList.remove('clicked');
            button.classList.remove('hidden'); // Show button with new content
        }, 500); // 500ms hiding period
    }, delay);
}

// Function to flash button
function flashButton(button, color) {
    const originalBackground = button.style.background;
    
    // Flash the button
    button.style.background = color;
    button.style.transition = 'background 0.1s ease';
    
    setTimeout(() => {
        button.style.background = originalBackground;
        button.style.transition = 'all 0.3s ease'; // Restore original transition
    }, 200);
}

// Handle button click
function handleButtonClick(event) {
    if (!gameActive) return;
    
    const button = event.target;
    const teamName = button.dataset.teamName;
    const isTrap = button.dataset.isTrap === 'true';
    const buttonIndex = button.dataset.index;
    
    // Prevent clicking the same individual button twice before labels change
    if (clickedButtonsThisRound.has(buttonIndex)) {
        return; // Can't click same button twice in one round
    }
    
    // Track this individual button as clicked
    clickedButtonsThisRound.add(buttonIndex);
    
    button.disabled = true;
    button.classList.add('clicked');
    
    // Flash button based on correct/wrong answer
    if (isTrap) {
        flashButton(button, '#ff0000'); // Red for wrong
        score -= 5;
    } else {
        flashButton(button, '#00ff00'); // Green for correct
        score += 5;
    }
    
    scoreDisplay.textContent = score;
    
    // Add visual feedback
    const feedback = document.createElement('div');
    feedback.className = 'score-feedback';
    feedback.textContent = isTrap ? '-5' : '+5';
    feedback.style.color = isTrap ? '#ff0000' : '#00ff00';
    button.appendChild(feedback);
    
    setTimeout(() => {
        if (feedback.parentNode) {
            feedback.parentNode.removeChild(feedback);
        }
    }, 1000);
    
    // Hide the button immediately
    button.classList.add('hidden');
    
    // Fade the button back in after 500ms (but keep it disabled)
    setTimeout(() => {
        button.classList.remove('hidden');
    }, 500);
}

// Start new round (randomize buttons)
function startNewRound() {
    currentRound++;
    randomizeButtons();
}

// Event listeners
startBtn.addEventListener('click', showInstructions);
startGameBtn.addEventListener('click', startGame);

function showInstructions() {
    const playerName = nameInput.value.trim();
    if (!playerName) {
        alert('Vennligst skriv inn ditt navn');
        return;
    }
    
    // Show instruction overlay
    instructionOverlay.style.display = 'flex';
}

function startGame() {
    const playerName = nameInput.value.trim();
    if (!playerName) {
        alert('Vennligst skriv inn ditt navn');
        return;
    }
    
    // Hide instruction overlay
    instructionOverlay.style.display = 'none';
    
    startBtn.disabled = true;
    nameInput.disabled = true;
    resultDiv.style.display = 'none';
    
    initGame();
    startTimer();
}

function initGame() {
    score = 0;
    currentRound = 0;
    clickedTeamsThisRound.clear();
    clickedButtonsThisRound.clear(); // Clear individual button tracking
    scoreDisplay.textContent = '0';
    gameActive = true;
    
    createGrid();
    
    // Enable all buttons and reset their appearance
    const buttons = document.querySelectorAll('.grid-button');
    buttons.forEach(button => {
        button.disabled = false;
        button.style.opacity = '1';
        button.classList.remove('clicked');
        button.classList.remove('hidden');
    });
    
    // Start round rotation every 3 seconds
    roundInterval = setInterval(startNewRound, 3000);
}

function startTimer() {
    timeDisplay.textContent = countdown;
    
    timerInterval = setInterval(() => {
        countdown--;
        timeDisplay.textContent = countdown;
        
        if (countdown <= 0) {
            endGame();
        }
    }, 1000);
}

function endGame() {
    gameActive = false;
    clearInterval(timerInterval);
    clearInterval(roundInterval);
    
    // Disable all buttons
    const buttons = document.querySelectorAll('.grid-button');
    buttons.forEach(button => {
        button.disabled = true;
    });
    
    calculateAndShowResults();
    
    // Re-enable the start button and name input for replay
    setTimeout(() => {
        startBtn.disabled = false;
        nameInput.disabled = false;
        countdown = 30; // Reset countdown for next game
    }, 1000);
}

function calculateAndShowResults() {
    finalScore.textContent = score;
    resultDiv.style.display = 'block';
    
    // Save score to Supabase
    saveScore(nameInput.value.trim(), score);
}

async function saveScore(name, score) {
    if (!supabaseClient) {
        console.log('Supabase not configured');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('resultater')
            .insert([{ name: name, score: score }]);
        
        if (error) {
            console.error('Error saving score:', error);
        } else {
            console.log('Score saved successfully');
        }
    } catch (error) {
        console.error('Error connecting to Supabase:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Set initial display
    timeDisplay.textContent = '30';
    scoreDisplay.textContent = '0';
    
    // Hide instruction overlay initially
    instructionOverlay.style.display = 'none';
    
    // Create initial grid for preview (disabled)
    createGrid();
    const buttons = document.querySelectorAll('.grid-button');
    buttons.forEach(button => {
        button.disabled = true;
        button.style.opacity = '0.5';
    });
});
