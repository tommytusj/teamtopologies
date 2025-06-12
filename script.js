// Matter.js modules
const { Engine, Render, Runner, Bodies, World, Mouse, MouseConstraint, Events, Body } = Matter;

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
let engine, render, runner, world;
let blocks = [];
let trapBlocks = [];
let countdown = 20;
let gameActive = false;
let timerInterval;
let platform;

// UI elements
const nameInput = document.getElementById('nameInput');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const timeDisplay = document.getElementById('timeDisplay');
const heightDisplay = document.getElementById('heightDisplay');
const resultDiv = document.getElementById('result');
const finalHeight = document.getElementById('finalHeight');

// Team types configuration
const teamTypes = [
    {
        name: 'Plattform',
        width: 160,
        height: 40,
        color: '#9FC5E8',
        count: 2,
        isTrap: false
    },
    {
        name: 'Verdistrøm',
        width: 80,
        height: 80,
        color: '#F8D568',
        count: 2,
        isTrap: false
    },
    {
        name: 'Enabling',
        width: 80,
        height: 120,
        color: '#D5A6BD',
        count: 2,
        isTrap: false
    },
    {
        name: 'Subsystem',
        width: 60,
        height: 60,
        color: '#F6B26B',
        count: 2,
        isTrap: false
    },
    {
        name: 'Database',
        width: 100,
        height: 100,
        color: '#cccccc',
        count: 2,
        isTrap: true
    },
    {
        name: 'Portefølje',
        width: 100,
        height: 100,
        color: '#b6d7a8',
        count: 2,
        isTrap: true
    }
];

// Event listeners
startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);
window.addEventListener('resize', handleResize);

function startGame() {
    const playerName = nameInput.value.trim();
    if (!playerName) {
        alert('Vennligst skriv inn ditt navn');
        return;
    }
    
    startBtn.disabled = true;
    nameInput.disabled = true;
    resultDiv.style.display = 'none';
    resetBtn.style.display = 'inline-block';
    
    initGame();
    startTimer();
}

function resetGame() {
    // Stop timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Clean up Matter.js
    if (render) {
        Render.stop(render);
        render.canvas.remove();
        render.canvas = null;
        render.context = null;
        render.textures = {};
    }
    
    if (runner) {
        Runner.stop(runner);
    }
    
    if (engine) {
        World.clear(engine.world);
        Engine.clear(engine);
    }
    
    // Reset variables
    blocks = [];
    trapBlocks = [];
    countdown = 20;
    gameActive = false;
    
    // Reset UI
    startBtn.disabled = false;
    nameInput.disabled = false;
    nameInput.value = '';
    timeDisplay.textContent = '20';
    heightDisplay.textContent = '0';
    resultDiv.style.display = 'none';
    resetBtn.style.display = 'none';
}

function initGame() {
    // Create engine with lower gravity
    engine = Engine.create();
    engine.world.gravity.y = 0.5;
    world = engine.world;
    
    // Create renderer
    const canvas = document.getElementById('world');
    render = Render.create({
        canvas: canvas,
        engine: engine,
        options: {
            width: window.innerWidth,
            height: window.innerHeight,
            wireframes: false,
            background: '#87CEEB',
            showVelocity: false,
            showAngleIndicator: false,
            showDebug: false
        }
    });
    
    // Create boundaries
    const ground = Bodies.rectangle(window.innerWidth / 2, window.innerHeight - 10, window.innerWidth, 20, {
        isStatic: true,
        render: { fillStyle: '#8B4513' }
    });
    
    const leftWall = Bodies.rectangle(-10, window.innerHeight / 2, 20, window.innerHeight, {
        isStatic: true,
        render: { fillStyle: '#8B4513' }
    });
    
    const rightWall = Bodies.rectangle(window.innerWidth + 10, window.innerHeight / 2, 20, window.innerHeight, {
        isStatic: true,
        render: { fillStyle: '#8B4513' }
    });
    
    // Create platform (TINE logo placeholder)
    platform = Bodies.rectangle(window.innerWidth / 2, window.innerHeight - 80, 200, 20, {
        isStatic: true,
        render: { fillStyle: '#666' }
    });
    
    World.add(world, [ground, leftWall, rightWall, platform]);
    
    // Create team blocks
    createTeamBlocks();
    
    // Add mouse/touch controls
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
            stiffness: 0.8,
            render: {
                visible: false
            }
        }
    });
    
    World.add(world, mouseConstraint);
    
    // Handle touch events for mobile
    render.canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        mouse.position.x = e.touches[0].clientX;
        mouse.position.y = e.touches[0].clientY;
    });
    
    render.canvas.addEventListener('touchmove', function(e) {
        e.preventDefault();
        mouse.position.x = e.touches[0].clientX;
        mouse.position.y = e.touches[0].clientY;
    });
    
    // Start rendering
    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);
    
    // Add event for rendering labels
    Events.on(render, 'afterRender', drawLabels);
    
    gameActive = true;
}

function createTeamBlocks() {
    let xOffset = 50;
    const baseY = window.innerHeight - 150;
    
    teamTypes.forEach(teamType => {
        for (let i = 0; i < teamType.count; i++) {
            const blockX = xOffset;
            const blockY = baseY - (i * (teamType.height + 10));
            
            const block = Bodies.rectangle(
                blockX,
                blockY,
                teamType.width,
                teamType.height,
                {
                    restitution: 0, // No bouncing
                    friction: 0.8, // High friction
                    frictionStatic: 0.9,
                    inertia: Infinity, // Prevents rotation when dragged
                    render: {
                        fillStyle: teamType.color,
                        strokeStyle: '#333',
                        lineWidth: 2
                    }
                }
            );
            
            // Add team type info to the block
            block.teamType = teamType.name;
            block.isTrap = teamType.isTrap || false;
            block.initialPosition = { x: blockX, y: blockY };
            
            blocks.push(block);
            
            // Keep track of trap blocks separately
            if (block.isTrap) {
                trapBlocks.push(block);
            }
            
            World.add(world, block);
        }
        xOffset += teamType.width + 30;
    });
}

function drawLabels() {
    const context = render.context;
    
    blocks.forEach(block => {
        if (block.teamType) {
            const pos = block.position;
            const bounds = block.bounds;
            
            context.save();
            context.fillStyle = '#000';
            context.font = 'bold 12px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            
            // Calculate text position
            const textX = pos.x;
            const textY = pos.y;
            
            context.fillText(block.teamType, textX, textY);
            context.restore();
        }
    });
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

function checkTrapBlocksUsed() {
    // Check if any trap block has been moved significantly from its initial position
    const moveThreshold = 50; // pixels
    
    return trapBlocks.some(block => {
        const distanceX = Math.abs(block.position.x - block.initialPosition.x);
        const distanceY = Math.abs(block.position.y - block.initialPosition.y);
        return distanceX > moveThreshold || distanceY > moveThreshold;
    });
}

function triggerChaosExplosion() {
    // Create explosive forces on all trap blocks that have been moved
    trapBlocks.forEach(block => {
        const distanceX = Math.abs(block.position.x - block.initialPosition.x);
        const distanceY = Math.abs(block.position.y - block.initialPosition.y);
        
        if (distanceX > 50 || distanceY > 50) {
            // Apply random explosive force
            const explosionForce = 0.3;
            const randomX = (Math.random() - 0.5) * explosionForce;
            const randomY = (Math.random() - 0.5) * explosionForce;
            
            Body.applyForce(block, block.position, {
                x: randomX,
                y: randomY
            });
            
            // Also affect nearby blocks
            blocks.forEach(otherBlock => {
                if (otherBlock !== block) {
                    const distance = Math.sqrt(
                        Math.pow(block.position.x - otherBlock.position.x, 2) +
                        Math.pow(block.position.y - otherBlock.position.y, 2)
                    );
                    
                    if (distance < 200) { // Within explosion radius
                        const forceMultiplier = (200 - distance) / 200 * 0.2;
                        const directionX = (otherBlock.position.x - block.position.x) / distance;
                        const directionY = (otherBlock.position.y - block.position.y) / distance;
                        
                        Body.applyForce(otherBlock, otherBlock.position, {
                            x: directionX * forceMultiplier,
                            y: directionY * forceMultiplier
                        });
                    }
                }
            });
        }
    });
}

function endGame() {
    gameActive = false;
    clearInterval(timerInterval);
    
    // Check if trap blocks were used and trigger chaos if so
    const trapBlocksUsed = checkTrapBlocksUsed();
    
    if (trapBlocksUsed) {
        // Trigger chaos explosion
        triggerChaosExplosion();
        
        // Wait a moment for chaos to settle before calculating height
        setTimeout(() => {
            calculateAndShowResults();
        }, 2000); // 2 second delay for chaos
    } else {
        // No trap blocks used, calculate immediately
        calculateAndShowResults();
    }
}

function calculateAndShowResults() {
    // Calculate tower height
    const towerHeight = calculateTowerHeight();
    heightDisplay.textContent = towerHeight;
    finalHeight.textContent = towerHeight;
    
    // Show result
    resultDiv.style.display = 'block';
    
    // Save score to Supabase
    saveScore(nameInput.value.trim(), towerHeight);
}

function calculateTowerHeight() {
    const platformTop = platform.position.y - 10; // Platform surface
    let highestPoint = platformTop;
    
    blocks.forEach(block => {
        const blockTop = block.bounds.min.y;
        if (blockTop < highestPoint) {
            highestPoint = blockTop;
        }
    });
    
    return Math.max(0, Math.round(platformTop - highestPoint));
}

async function saveScore(name, score) {
    if (!supabaseClient) {
        console.log('Supabase not configured, score not saved:', { name, score });
        return;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('resultater')
            .insert([{ name: name, score: score }]);
        
        if (error) {
            console.error('Error saving score:', error);
        } else {
            console.log('Score saved successfully:', { name, score });
        }
    } catch (error) {
        console.error('Error connecting to Supabase:', error);
    }
}

function handleResize() {
    if (render) {
        render.canvas.width = window.innerWidth;
        render.canvas.height = window.innerHeight;
        render.options.width = window.innerWidth;
        render.options.height = window.innerHeight;
    }
}

// Initialize canvas size on load
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('world');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});