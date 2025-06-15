// Supabase configuration (same as main game)
const supabaseUrl = 'https://svjcokhvmzivbmecjgoc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2amNva2h2bXppdmJtZWNqZ29jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NzAwNjIsImV4cCI6MjA2NTI0NjA2Mn0.pBE8xYDAzPPxT7v31H0Cp419tq3xuRZSdJ4B7JVZX0g';
let supabaseClient = null;

// Initialize Supabase client
if (typeof supabase !== 'undefined' && supabase.createClient) {
    try {
        supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    } catch (error) {
        console.log('Supabase not configured properly:', error);
    }
}

// DOM elements
const loadingElement = document.getElementById('loading');
const emptyStateElement = document.getElementById('empty-state');
const scoreListElement = document.getElementById('score-list');
const messageAreaElement = document.getElementById('message-area');
const refreshBtn = document.getElementById('refresh-btn');
const playerCountElement = document.getElementById('player-count');

// State
let currentScores = [];
let pollInterval = null;

// Funny Norwegian Team Topologies messages
const funnyMessages = [
    "🎉 {name} har virkelig lest boka!",
    "💰 {name} burde få en lønnsforhøyelse!",
    "🏗️ Ingen kan plattform bedre enn {name}!",
    "🚀 {name} har stream-aligned seg til topps!",
    "⚡ {name} enabler alle andre!",
    "🎯 {name} forstår complicated subsystems!",
    "🔥 {name} bygger Conway's Law riktig!",
    "🏆 {name} har mastery i Team Topologies!",
    "💡 {name} tenker i team-first!",
    "🌟 {name} er en ekte Team Topologies ninja!",
    "🎊 {name} forstår cognitive load!",
    "🏅 {name} bygger som en proff!",
    "⭐ {name} har cracked team interaction modes!",
    "🎨 {name} designer team-strukturer som kunst!",
    "🎪 {name} jonglerer med team-typer som en mester!"
];

// Time formatting function
function timeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Akkurat nå';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m siden`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}t siden`;
    return `${Math.floor(diffInSeconds / 86400)}d siden`;
}

// Show a funny message
function showMessage(name) {
    const randomMessage = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
    const message = randomMessage.replace('{name}', name);
    
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.textContent = message;
    
    messageAreaElement.innerHTML = '';
    messageAreaElement.appendChild(messageElement);
    
    // Clear message after 5 seconds
    setTimeout(() => {
        if (messageAreaElement.contains(messageElement)) {
            messageElement.style.animation = 'messageSlideIn 0.5s ease-out reverse';
            setTimeout(() => {
                if (messageAreaElement.contains(messageElement)) {
                    messageAreaElement.removeChild(messageElement);
                }
            }, 500);
        }
    }, 5000);
}

// Create score row element
function createScoreRow(score, rank, isNew = false) {
    const row = document.createElement('div');
    row.className = `score-row ${isNew ? 'new-entry' : ''}`;
    row.dataset.scoreId = score.id;
    
    const rankClass = rank <= 3 ? `rank-${rank} top-3` : '';
    
    row.innerHTML = `
        <div class="rank ${rankClass}">${rank}</div>
        <div class="player-name">${escapeHtml(score.name)}</div>
        <div class="score">${score.score}</div>
        <div class="time-ago">${timeAgo(new Date(score.created_at))}</div>
    `;
    
    return row;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Fetch top 10 scores from Supabase
async function fetchScores() {
    if (!supabaseClient) {
        console.log('Supabase not configured');
        showEmptyState();
        return [];
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('resultater')
            .select('*')
            .order('score', { ascending: false })
            .limit(10);
        
        if (error) {
            console.error('Error fetching scores:', error);
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error('Error connecting to Supabase:', error);
        return [];
    }
}

// Fetch total player count
async function fetchPlayerCount() {
    if (!supabaseClient) {
        return 0;
    }
    
    try {
        const { count, error } = await supabaseClient
            .from('resultater')
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            console.error('Error fetching player count:', error);
            return 0;
        }
        
        return count || 0;
    } catch (error) {
        console.error('Error connecting to Supabase:', error);
        return 0;
    }
}

// Update the scoreboard with new scores
function updateScoreboard(scores) {
    const previousScoreIds = currentScores.map(s => s.id);
    const newScoreIds = scores.map(s => s.id);
    
    // Find new entries
    const newEntries = scores.filter(score => !previousScoreIds.includes(score.id));
    
    // Clear current scoreboard
    scoreListElement.innerHTML = '';
    
    // Add all scores
    scores.forEach((score, index) => {
        const rank = index + 1;
        const isNew = newEntries.some(newEntry => newEntry.id === score.id);
        const row = createScoreRow(score, rank, isNew);
        scoreListElement.appendChild(row);
    });
    
    // Show funny message for new high-scoring entries
    if (newEntries.length > 0) {
        const highestNewScore = Math.max(...newEntries.map(e => e.score));
        const highestNewEntry = newEntries.find(e => e.score === highestNewScore);
        showMessage(highestNewEntry.name);
    }
    
    // Update current scores
    currentScores = [...scores];
}

// Show empty state
function showEmptyState() {
    loadingElement.style.display = 'none';
    emptyStateElement.style.display = 'block';
    document.querySelector('.scoreboard').style.display = 'none';
}

// Show scoreboard
function showScoreboard() {
    loadingElement.style.display = 'none';
    emptyStateElement.style.display = 'none';
    document.querySelector('.scoreboard').style.display = 'block';
}

// Update time ago for all visible scores
function updateTimeAgo() {
    const timeElements = document.querySelectorAll('.time-ago');
    timeElements.forEach((element, index) => {
        if (currentScores[index]) {
            element.textContent = timeAgo(new Date(currentScores[index].created_at));
        }
    });
}

// Load and display scores
async function loadScores() {
    const [scores, playerCount] = await Promise.all([
        fetchScores(),
        fetchPlayerCount()
    ]);
    
    // Update player count
    if (playerCountElement) {
        playerCountElement.textContent = playerCount;
    }
    
    if (scores.length === 0) {
        showEmptyState();
    } else {
        showScoreboard();
        updateScoreboard(scores);
    }
}

// Start polling for updates
function startPolling() {
    // Initial load
    loadScores();
    
    // Poll every 3 seconds
    pollInterval = setInterval(async () => {
        const [scores, playerCount] = await Promise.all([
            fetchScores(),
            fetchPlayerCount()
        ]);
        
        // Update player count
        if (playerCountElement) {
            playerCountElement.textContent = playerCount;
        }
        
        if (scores.length > 0) {
            if (emptyStateElement.style.display !== 'none') {
                showScoreboard();
            }
            updateScoreboard(scores);
        }
    }, 3000);
    
    // Update time ago every 30 seconds
    setInterval(updateTimeAgo, 30000);
}

// Stop polling
function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    startPolling();
    
    // Add refresh button handler
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadScores();
        });
    }
});

// Clean up when page unloads
window.addEventListener('beforeunload', () => {
    stopPolling();
});

// Handle visibility change (pause polling when tab is not visible)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopPolling();
    } else {
        startPolling();
    }
});