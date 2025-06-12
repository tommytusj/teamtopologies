// Matter.js modules
const { Engine, Render, Runner, Bodies, World, Mouse, MouseConstraint, Events } = Matter;

// Supabase configuration
const supabaseUrl = 'https://your-project.supabase.co'; // Replace with actual URL
const supabaseKey = 'your-anon-key'; // Replace with actual anon key
const supabase = supabase?.createClient ? supabase.createClient(supabaseUrl, supabaseKey) : null;

// Game variables
let engine, render, runner, world;
let blocks = [];
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
        count: 2
    },
    {
        name: 'Verdistrøm',
        width: 80,
        height: 80,
        color: '#F8D568',
        count: 2
    },
    {
        name: 'Enabling',
        width: 80,
        height: 120,
        color: '#D5A6BD',
        count: 2
    },
    {
        name: 'Subsystem',
        width: 60,
        height: 60,
        color: '#F6B26B',
        count: 2
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
            const block = Bodies.rectangle(
                xOffset,
                baseY - (i * (teamType.height + 10)),
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
            blocks.push(block);
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

function endGame() {
    gameActive = false;
    clearInterval(timerInterval);
    
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
    if (!supabase) {
        console.log('Supabase not configured, score not saved:', { name, score });
        return;
    }
    
    try {
        const { data, error } = await supabase
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