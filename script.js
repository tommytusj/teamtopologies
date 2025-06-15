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
let factoryImage;
let grassImage;

// Load factory image
function loadFactoryImage() {
    factoryImage = new Image();
    factoryImage.src = 'assets/ChatGPT Image 15. juni 2025, 11_30_02.png';
    factoryImage.onload = function() {
        console.log('Factory image loaded');
    };
    factoryImage.onerror = function() {
        console.log('Factory image failed to load, using fallback');
        factoryImage = null;
    };
}

// Load grass image
function loadGrassImage() {
    grassImage = new Image();
    grassImage.src = 'grass.png';
    grassImage.onload = function() {
        console.log('Grass image loaded');
    };
    grassImage.onerror = function() {
        console.log('Grass image failed to load, using fallback');
        grassImage = null;
    };
}

// Mobile detection and size scaling
function isMobile() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function getScaleFactor() {
    return isMobile() ? 0.75 : 1.0; // 25% smaller on mobile
}

function getPlatformWidth() {
    const baseWidth = 200;
    const scaleFactor = getScaleFactor();
    // Additional 25% reduction on mobile as requested
    const mobileReduction = isMobile() ? 0.75 : 1.0;
    return baseWidth * scaleFactor * mobileReduction; // Base width 200px, scaled for mobile, then additional reduction
}

// UI elements
const nameInput = document.getElementById('nameInput');
const startBtn = document.getElementById('startBtn');
const timeDisplay = document.getElementById('timeDisplay');
const heightDisplay = document.getElementById('heightDisplay');
const resultDiv = document.getElementById('result');
const finalHeight = document.getElementById('finalHeight');

// Team types configuration
const teamTypes = [
    {
        name: 'Plattform',
        width: 100,
        height: 25,
        color: '#9FC5E8',
        count: 3,
        isTrap: false
    },
    {
        name: 'Verdistrøm',
        width: 50,
        height: 50,
        color: '#F8D568',
        count: 3,
        isTrap: false
    },
    {
        name: 'Enabling',
        width: 50,
        height: 75,
        color: '#D5A6BD',
        count: 3,
        isTrap: false
    },
    {
        name: 'Subsystem',
        width: 40,
        height: 40,
        color: '#F6B26B',
        count: 3,
        isTrap: false
    },
    {
        name: 'Database',
        width: 60,
        height: 60,
        color: '#cccccc',
        count: 2,
        isTrap: true
    },
    {
        name: 'Portefølje',
        width: 60,
        height: 60,
        color: '#b6d7a8',
        count: 2,
        isTrap: true
    },
    {
        name: 'Support',
        width: 60,
        height: 60,
        color: '#ff9999',
        count: 2,
        isTrap: true
    },
    {
        name: 'Smidig',
        width: 60,
        height: 60,
        color: '#c9daf8',
        count: 2,
        isTrap: true
    },
    {
        name: 'Test',
        radius: 30,
        color: '#000000',
        textColor: '#ffffff',
        count: 1,
        isTrap: true,
        isRound: true
    }
];

// Event listeners
startBtn.addEventListener('click', startGame);
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
}

function initGame() {
    // Create engine with higher gravity for more realistic and unstable physics
    engine = Engine.create();
    engine.world.gravity.y = 1.0; // Increased from 0.8 for more instability
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
            background: '#ffffff',
            showVelocity: false,
            showAngleIndicator: false,
            showDebug: false
        }
    });
    
    // Create boundaries
    const ground = Bodies.rectangle(window.innerWidth / 2, window.innerHeight - 10, window.innerWidth, 20, {
        isStatic: true,
        friction: 0.8, // Higher friction for ground to provide contrast
        render: { fillStyle: 'transparent' } // Make transparent since we'll draw grass image
    });
    
    const leftWall = Bodies.rectangle(-10, window.innerHeight / 2, 20, window.innerHeight, {
        isStatic: true,
        render: { fillStyle: '#8B4513' }
    });
    
    const rightWall = Bodies.rectangle(window.innerWidth + 10, window.innerHeight / 2, 20, window.innerHeight, {
        isStatic: true,
        render: { fillStyle: '#8B4513' }
    });
    
    // Create platform (using factory image as platform)
    platform = Bodies.rectangle(window.innerWidth / 2, window.innerHeight - 80, getPlatformWidth(), 50, {
        isStatic: true,
        friction: 0.6, // Medium friction on platform - not too grippy
        render: { 
            fillStyle: 'transparent', // Make invisible, we'll draw image on top
            strokeStyle: '#333',
            lineWidth: 3
        }
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
    
    // Add collision event to create instability when blocks land on each other
    Events.on(engine, 'collisionStart', function(event) {
        event.pairs.forEach(function(pair) {
            const { bodyA, bodyB } = pair;
            
            // Skip if either body is static (ground, walls, platform)
            if (bodyA.isStatic || bodyB.isStatic) return;
            
            // Add small random forces to create instability when blocks collide
            const perturbationForce = 0.002;
            const randomX = (Math.random() - 0.5) * perturbationForce;
            const randomY = (Math.random() - 0.5) * perturbationForce * 0.5; // Less vertical randomness
            
            // Apply small force to both bodies to create realistic instability
            Body.applyForce(bodyA, bodyA.position, { x: randomX, y: randomY });
            Body.applyForce(bodyB, bodyB.position, { x: -randomX, y: randomY });
            
            // Add small angular velocity to encourage tipping
            const angularPerturbation = (Math.random() - 0.5) * 0.01;
            Body.setAngularVelocity(bodyA, bodyA.angularVelocity + angularPerturbation);
            Body.setAngularVelocity(bodyB, bodyB.angularVelocity - angularPerturbation);
        });
    });
    
    gameActive = true;
}

function createTeamBlocks() {
    // Start blocks further from the center to avoid platform area
    let xOffset = isMobile() ? 20 : 30; // Start closer to left edge on mobile
    const baseY = window.innerHeight - 150;
    
    // Track trap blocks to place on platform - one of each type
    let trapBlocksToPlace = {};
    
    teamTypes.forEach(teamType => {
        for (let i = 0; i < teamType.count; i++) {
            const blockX = xOffset;
            const scaleFactor = getScaleFactor();
            const blockHeight = teamType.isRound ? (teamType.radius * 2 * scaleFactor) : (teamType.height * scaleFactor);
            const blockY = baseY - (i * (blockHeight + 10));
            
            let block;
            if (teamType.isRound) {
                block = Bodies.circle(
                    blockX,
                    blockY,
                    teamType.radius * scaleFactor,
                    {
                        restitution: 0.2, // Increased bounce for more dynamic interactions
                        friction: 0.2, // Much lower friction - blocks slip easily
                        frictionStatic: 0.3, // Lower static friction - easier to start sliding
                        frictionAir: 0.01, // Air resistance for more realistic motion
                        density: 0.001, // Lower density for easier tipping
                        render: {
                            fillStyle: teamType.color,
                            strokeStyle: '#333',
                            lineWidth: 2
                        }
                    }
                );
            } else {
                block = Bodies.rectangle(
                    blockX,
                    blockY,
                    teamType.width * scaleFactor,
                    teamType.height * scaleFactor,
                    {
                        restitution: 0.2, // Increased bounce for more dynamic interactions
                        friction: 0.2, // Much lower friction - blocks slip easily
                        frictionStatic: 0.3, // Lower static friction - easier to start sliding
                        frictionAir: 0.01, // Air resistance for more realistic motion
                        density: 0.001, // Lower density for easier tipping
                        // Removed inertia: Infinity to allow rotation and tipping
                        render: {
                            fillStyle: teamType.color,
                            strokeStyle: '#333',
                            lineWidth: 2
                        }
                    }
                );
            }
            
            // Add team type info to the block
            block.teamType = teamType.name;
            block.isTrap = teamType.isTrap || false;
            block.isRound = teamType.isRound || false;
            block.textColor = teamType.textColor || '#000';
            block.initialPosition = { x: blockX, y: blockY };
            
            blocks.push(block);
            
            // Keep track of trap blocks separately
            if (block.isTrap) {
                trapBlocks.push(block);
                // Collect one block of each trap type for platform placement
                if (!trapBlocksToPlace[teamType.name] && 
                    (teamType.name === 'Support' || teamType.name === 'Smidig' || teamType.name === 'Test')) {
                    trapBlocksToPlace[teamType.name] = block;
                }
            }
            
            World.add(world, block);
        }
        const scaleFactor = getScaleFactor();
        const blockWidth = teamType.isRound ? (teamType.radius * 2 * scaleFactor) : (teamType.width * scaleFactor);
        xOffset += blockWidth + 15;
    });
    
    // Place one trap block of each type on the platform
    const platformSpecificTraps = ['Support', 'Smidig', 'Test'];
    const availableTraps = platformSpecificTraps.filter(name => trapBlocksToPlace[name]);
    
    if (availableTraps.length > 0) {
        const platformX = window.innerWidth / 2;
        const platformY = window.innerHeight - 80;
        const scaleFactor = getScaleFactor();
        const spacing = 60 * scaleFactor; // Scale the spacing too
        
        // Position trap blocks based on available types
        if (availableTraps.includes('Support')) {
            Body.setPosition(trapBlocksToPlace['Support'], {
                x: platformX - spacing,
                y: platformY - 40
            });
            trapBlocksToPlace['Support'].initialPosition = { x: platformX - spacing, y: platformY - 40 };
        }
        
        if (availableTraps.includes('Smidig')) {
            Body.setPosition(trapBlocksToPlace['Smidig'], {
                x: platformX + spacing,
                y: platformY - 40
            });
            trapBlocksToPlace['Smidig'].initialPosition = { x: platformX + spacing, y: platformY - 40 };
        }
        
        if (availableTraps.includes('Test')) {
            Body.setPosition(trapBlocksToPlace['Test'], {
                x: platformX,
                y: platformY - 40
            });
            trapBlocksToPlace['Test'].initialPosition = { x: platformX, y: platformY - 40 };
        }
    }
}

function drawLabels() {
    const context = render.context;
    
    // Draw grass image as floor/ground
    if (grassImage) {
        context.save();
        
        // Calculate grass height as 25% of factory platform height
        const platformWidth = getPlatformWidth();
        const factoryAspectRatio = 1536 / 1024; // width / height = 1.5
        const factoryHeight = platformWidth / factoryAspectRatio;
        const grassHeight = factoryHeight * 0.25;
        
        // Get natural grass image dimensions to maintain aspect ratio
        const grassAspectRatio = grassImage.naturalWidth / grassImage.naturalHeight;
        const grassWidth = grassHeight * grassAspectRatio;
        
        // Fill the width by tiling the grass image (don't stretch)
        const grassY = window.innerHeight - grassHeight;
        let currentX = 0;
        
        while (currentX < window.innerWidth) {
            context.drawImage(
                grassImage,
                currentX,
                grassY,
                grassWidth,
                grassHeight
            );
            currentX += grassWidth;
        }
        
        context.restore();
    }
    
    // Draw factory image on platform if loaded
    if (factoryImage && platform) {
        const platformX = platform.position.x;
        const platformY = platform.position.y;
        const platformWidth = getPlatformWidth();
        
        // Calculate height to maintain factory image aspect ratio (1536x1024 = 1.5:1)
        const aspectRatio = 1536 / 1024; // width / height = 1.5
        const factoryHeight = platformWidth / aspectRatio;
        
        // Extend factory image all the way down from platform to bottom
        const bottomY = window.innerHeight;
        const totalHeight = bottomY - (platformY - 25); // Start from platform top
        
        context.save();
        // Draw factory image extending down
        context.drawImage(
            factoryImage,
            platformX - platformWidth / 2,
            platformY - 25, // Start from platform top
            platformWidth,
            totalHeight // Extend all the way to bottom
        );
        
        // Draw border only on top of the platform to show where platform starts
        context.strokeStyle = '#333';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(platformX - platformWidth / 2, platformY - 25);
        context.lineTo(platformX + platformWidth / 2, platformY - 25);
        context.stroke();
        
        context.restore();
    }
    
    blocks.forEach(block => {
        if (block.teamType) {
            const pos = block.position;
            const bounds = block.bounds;
            
            context.save();
            context.fillStyle = block.textColor || '#000';
            const scaleFactor = getScaleFactor();
            const fontSize = Math.max(8, Math.round(10 * scaleFactor)); // Scale font but keep minimum readable size
            context.font = `bold ${fontSize}px Arial`;
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


function triggerChaosExplosion() {
    // Create explosive forces on ALL trap blocks (50% more powerful than before)
    trapBlocks.forEach(block => {
        // Visual feedback: make trap block flash red
        block.render.fillStyle = '#FF0000';
        
        // Apply explosive force to the trap block itself (15% less than 0.1)
        const explosionForce = 0.085; // Reduced from 0.1 to 0.085 (15% less powerful)
        const randomX = (Math.random() - 0.5) * explosionForce;
        const randomY = (Math.random() - 0.5) * explosionForce;
        
        Body.applyForce(block, block.position, {
            x: randomX,
            y: randomY
        });
        
        // Also affect nearby blocks with 50% more force
        blocks.forEach(otherBlock => {
            if (otherBlock !== block) {
                const distance = Math.sqrt(
                    Math.pow(block.position.x - otherBlock.position.x, 2) +
                    Math.pow(block.position.y - otherBlock.position.y, 2)
                );
                
                if (distance < 100) { // Smaller radius for more localized effect
                    const forceMultiplier = (100 - distance) / 100 * 0.051; // 15% less force (0.06 -> 0.051)
                    const directionX = (otherBlock.position.x - block.position.x) / distance;
                    const directionY = (otherBlock.position.y - block.position.y) / distance;
                    
                    Body.applyForce(otherBlock, otherBlock.position, {
                        x: directionX * forceMultiplier,
                        y: directionY * forceMultiplier - 0.017 // 15% less upward force (0.02 -> 0.017)
                    });
                }
            }
        });
    });
}

function endGame() {
    gameActive = false;
    clearInterval(timerInterval);
    
    // Always trigger explosion of all fake blocks when game ends
    triggerChaosExplosion();
    
    // Wait a moment for chaos to settle before calculating height
    setTimeout(() => {
        calculateAndShowResults();
    }, 2000); // 2 second delay for chaos
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
    const platformX = window.innerWidth / 2;
    const platformWidth = getPlatformWidth();
    const platformY = window.innerHeight - 80;
    const groundLevel = platformY;
    
    // Only consider blocks that are:
    // 1. Within platform boundaries (with some tolerance)
    // 2. Have low velocity (indicating they've settled)
    // 3. Are on or above the platform level
    let maxHeight = groundLevel; // Start from platform level
    
    blocks.forEach(block => {
        // Check if block is within platform horizontal boundaries (with tolerance)
        const blockX = block.position.x;
        const platformLeft = platformX - (platformWidth / 2) - 50; // Add 50px tolerance
        const platformRight = platformX + (platformWidth / 2) + 50; // Add 50px tolerance
        
        if (blockX >= platformLeft && blockX <= platformRight) {
            // Check if block has settled (low velocity)
            const velocity = Math.sqrt(block.velocity.x * block.velocity.x + block.velocity.y * block.velocity.y);
            const angularVelocity = Math.abs(block.angularVelocity);
            
            // Only count blocks that have settled (low velocity)
            if (velocity < 2 && angularVelocity < 0.1) {
                // Check if block is on or above platform level
                const blockTop = block.bounds.min.y;
                if (blockTop <= groundLevel && blockTop < maxHeight) {
                    maxHeight = blockTop;
                }
            }
        }
    });
    
    // Convert to score - higher towers get more points
    const towerHeight = Math.max(0, groundLevel - maxHeight);
    
    return Math.round(towerHeight);
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
    
    // Load factory image and grass image
    loadFactoryImage();
    loadGrassImage();
});