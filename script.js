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
let hasPlayedBefore = false;

// UI elements
const nameInput = document.getElementById('nameInput');
const startBtn = document.getElementById('startBtn');
const timeDisplay = document.getElementById('timeDisplay');
const scoreDisplay = document.getElementById('scoreDisplay');
const resultDiv = document.getElementById('result');
const finalScore = document.getElementById('finalScore');
const gameGrid = document.getElementById('game-grid');

// Team types configuration - same as original game
const teamTypes = [
    {
        name: 'Plattform',
        color: '#9FC5E8',
        isTrap: false
    },
    {
        name: 'Verdistrøm',
        color: '#F8D568',
        isTrap: false
    },
    {
        name: 'Enabling',
        color: '#D5A6BD',
        isTrap: false
    },
    {
        name: 'Subsystem',
        color: '#F6B26B',
        isTrap: false
    },
    {
        name: 'Database',
        color: '#cccccc',
        isTrap: true
    },
    {
        name: 'Portefølje',
        color: '#b6d7a8',
        isTrap: true
    },
    {
        name: 'Support',
        color: '#ff9999',
        isTrap: true
    },
    {
        name: 'Smidig',
        color: '#c9daf8',
        isTrap: true
    },
    {
        name: 'Test',
        color: '#000000',
        textColor: '#ffffff',
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

// Create the 4x6 button grid
function createGrid() {
    gameGrid.innerHTML = '';
    
    for (let i = 0; i < 24; i++) {
        const button = document.createElement('button');
        button.className = 'grid-button';
        button.dataset.index = i;
        button.addEventListener('click', handleButtonClick);
        gameGrid.appendChild(button);
    }
    
    randomizeButtons();
}

// Randomize button contents
function randomizeButtons() {
    const buttons = document.querySelectorAll('.grid-button');
    clickedTeamsThisRound.clear();
    
    buttons.forEach(button => {
        const randomTeam = teamTypes[Math.floor(Math.random() * teamTypes.length)];
        button.textContent = randomTeam.name;
        button.style.backgroundColor = randomTeam.color;
        button.style.color = randomTeam.textColor || '#000';
        button.dataset.teamName = randomTeam.name;
        button.dataset.isTrap = randomTeam.isTrap;
        button.disabled = false;
        button.classList.remove('clicked');
    });
}

// Handle button click
function handleButtonClick(event) {
    if (!gameActive) return;
    
    const button = event.target;
    const teamName = button.dataset.teamName;
    const isTrap = button.dataset.isTrap === 'true';
    
    // Check if this team type was already clicked this round
    if (clickedTeamsThisRound.has(teamName)) {
        return; // Can't click same team type twice in one round
    }
    
    clickedTeamsThisRound.add(teamName);
    button.disabled = true;
    button.classList.add('clicked');
    
    // Update score
    if (isTrap) {
        score -= 5;
    } else {
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
}

// Start new round (randomize buttons)
function startNewRound() {
    currentRound++;
    randomizeButtons();
}

// Event listeners
startBtn.addEventListener('click', startGame);

function startGame() {
    const playerName = nameInput.value.trim();
    if (!playerName) {
        alert('Vennligst skriv inn ditt navn');
        return;
    }
    
    // Check if already played
    if (checkPlayedBefore()) {
        alert('Du kan bare spille én gang!');
        return;
    }
    
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
    scoreDisplay.textContent = '0';
    gameActive = true;
    
    createGrid();
    
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
}

function calculateAndShowResults() {
    finalScore.textContent = score;
    resultDiv.style.display = 'block';
    
    // Mark as played
    markAsPlayed();
    
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
            .insert([{ navn: name, score: score }]);
        
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
    
    // Check if already played and disable if needed
    if (checkPlayedBefore()) {
        startBtn.textContent = 'Allerede spilt';
        startBtn.disabled = true;
        nameInput.disabled = true;
    }
});