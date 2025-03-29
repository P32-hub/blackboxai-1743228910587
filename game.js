// Game Constants
const ROAD_WIDTH = 400;
const LANE_COUNT = 3;
const CAR_WIDTH = 50;
const CAR_HEIGHT = 80;
const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT;
const POWERUP_TYPES = ['SPEED_BOOST'];

// Game State
let gameRunning = false;
let score = 0;
let speed = 0;
let maxSpeed = 5;
let acceleration = 0.01;
let roadOffset = 0;
let playerCar = {
    x: 0,
    y: 0,
    lane: 1, // Center lane
    width: CAR_WIDTH,
    height: CAR_HEIGHT,
    color: '#ff0000'
};

let opponentCars = [];
let powerups = [];
let lastCarTime = 0;
let lastPowerupTime = 0;
let carSpawnRate = 2000; // ms between cars
let powerupSpawnRate = 10000; // ms between powerups
let speedBoostActive = false;
let speedBoostEndTime = 0;

// Audio Elements
const sounds = {
    engine: new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU...'),
    crash: new Audio('data:audio/wav;base64,UklGRiZAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQ...'),
    boost: new Audio('data:audio/wav;base64,UklGRjZAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQ...'),
    score: new Audio('data:audio/wav;base64,UklGRkZAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQ...')
};

// Initialize sounds
function initSounds() {
    sounds.engine.loop = true;
    sounds.engine.volume = 0.3;
    sounds.crash.volume = 0.7;
    sounds.boost.volume = 0.5;
    sounds.score.volume = 0.5;
}

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const mainMenu = document.getElementById('mainMenu');
const startBtn = document.getElementById('startBtn');

// Initialize game
function initGame() {
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize sounds
    initSounds();

    // Event listeners
    startBtn.addEventListener('click', startGame);

    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Resize canvas to window
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Game loop
function gameLoop(timestamp) {
    if (gameRunning) {
        update();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// Handle keyboard input
function handleKeyDown(e) {
    if (!gameRunning) return;
    
    switch(e.key) {
        case 'ArrowLeft':
            if (playerCar.lane > 0) playerCar.lane--;
            break;
        case 'ArrowRight':
            if (playerCar.lane < LANE_COUNT - 1) playerCar.lane++;
            break;
    }
}

// Update game state
function update() {
    // Update road position
    roadOffset += speed;
    if (roadOffset >= canvas.height) roadOffset = 0;

    // Gradually increase speed
    if (speed < maxSpeed) {
        speed += acceleration;
    }

    const now = Date.now();
    
    // Spawn new opponent cars
    if (now - lastCarTime > carSpawnRate) {
        spawnOpponentCar();
        lastCarTime = now;
    }

    // Update opponent cars
    updateOpponentCars();

    // Spawn powerups
    if (now - lastPowerupTime > powerupSpawnRate) {
        spawnPowerup();
        lastPowerupTime = now;
    }

    // Update powerups
    updatePowerups();

    // Check collisions
    checkCollisions();

    // Check speed boost expiration
    if (speedBoostActive && now > speedBoostEndTime) {
        speedBoostActive = false;
        maxSpeed = 5;
    }
}

// Draw everything
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw road
    drawRoad();

    // Draw opponent cars
    drawOpponentCars();

    // Draw player car
    drawCar();

    // Draw powerups
    drawPowerups();

    // Draw score
    drawScore();

    // Draw speed boost indicator
    if (speedBoostActive) {
        ctx.fillStyle = '#ffff00';
        ctx.font = '20px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('SPEED BOOST!', canvas.width - 20, 40);
    }
}

// Draw player car
function drawCar() {
    // Calculate car position based on lane
    playerCar.x = canvas.width/2 - ROAD_WIDTH/2 + (LANE_WIDTH * playerCar.lane) + LANE_WIDTH/2 - CAR_WIDTH/2;
    playerCar.y = canvas.height - CAR_HEIGHT - 20;

    // Car body
    ctx.fillStyle = playerCar.color;
    ctx.beginPath();
    ctx.roundRect(playerCar.x, playerCar.y, CAR_WIDTH, CAR_HEIGHT, 10);
    ctx.fill();
    
    // Windows
    ctx.fillStyle = '#aaddff';
    ctx.beginPath();
    ctx.roundRect(playerCar.x + 5, playerCar.y + 10, CAR_WIDTH - 10, 20, 5);
    ctx.fill();
    
    // Headlights
    ctx.fillStyle = '#ffff99';
    ctx.fillRect(playerCar.x + 5, playerCar.y + 5, 10, 5);
    ctx.fillRect(playerCar.x + CAR_WIDTH - 15, playerCar.y + 5, 10, 5);
    
    // Taillights
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(playerCar.x + 5, playerCar.y + CAR_HEIGHT - 10, 10, 5);
    ctx.fillRect(playerCar.x + CAR_WIDTH - 15, playerCar.y + CAR_HEIGHT - 10, 10, 5);
    
    // Speed boost effect
    if (speedBoostActive) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(playerCar.x - 2, playerCar.y - 2, CAR_WIDTH + 4, CAR_HEIGHT + 4, 12);
        ctx.stroke();
    }
}

// Draw road with lanes
function drawRoad() {
    // Road background
    ctx.fillStyle = '#333';
    ctx.fillRect(canvas.width/2 - ROAD_WIDTH/2, 0, ROAD_WIDTH, canvas.height);

    // Lane markings
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.setLineDash([50, 30]);
    ctx.lineDashOffset = -roadOffset;

    for (let i = 1; i < LANE_COUNT; i++) {
        const laneX = canvas.width/2 - ROAD_WIDTH/2 + (ROAD_WIDTH/LANE_COUNT) * i;
        ctx.beginPath();
        ctx.moveTo(laneX, 0);
        ctx.lineTo(laneX, canvas.height);
        ctx.stroke();
    }
}

// Draw score display
function drawScore() {
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${Math.floor(score)}`, 20, 40);
}

// Start game
function startGame() {
    gameRunning = true;
    mainMenu.style.display = 'none';
    score = 0;
    speed = 0;
    sounds.engine.play();
}

// Spawn new opponent car
function spawnOpponentCar() {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const colors = ['#00f', '#0f0', '#f0f', '#ff0', '#0ff'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    opponentCars.push({
        x: canvas.width/2 - ROAD_WIDTH/2 + (LANE_WIDTH * lane) + LANE_WIDTH/2 - CAR_WIDTH/2,
        y: -CAR_HEIGHT,
        lane: lane,
        width: CAR_WIDTH,
        height: CAR_HEIGHT,
        color: color,
        speed: 2 + Math.random() * 3
    });
}

// Update opponent cars
function updateOpponentCars() {
    for (let i = opponentCars.length - 1; i >= 0; i--) {
        opponentCars[i].y += opponentCars[i].speed;
        
        // Remove cars that are off screen
        if (opponentCars[i].y > canvas.height) {
            opponentCars.splice(i, 1);
            score += 10;
            sounds.score.play();
        }
    }
}

// Draw opponent cars
function drawOpponentCars() {
    opponentCars.forEach(car => {
        // Car body
        ctx.fillStyle = car.color;
        ctx.beginPath();
        ctx.roundRect(car.x, car.y, car.width, car.height, 10);
        ctx.fill();
        
        // Windows
        ctx.fillStyle = '#aaddff';
        ctx.beginPath();
        ctx.roundRect(car.x + 5, car.y + 10, car.width - 10, 20, 5);
        ctx.fill();
        
        // Headlights
        ctx.fillStyle = '#ffff99';
        ctx.fillRect(car.x + 5, car.y + 5, 10, 5);
        ctx.fillRect(car.x + car.width - 15, car.y + 5, 10, 5);
    });
}

// Spawn powerup
function spawnPowerup() {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    
    powerups.push({
        x: canvas.width/2 - ROAD_WIDTH/2 + (LANE_WIDTH * lane) + LANE_WIDTH/2 - 15,
        y: -30,
        lane: lane,
        width: 30,
        height: 30,
        type: type
    });
}

// Update powerups
function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        powerups[i].y += 3;
        
        // Remove powerups that are off screen
        if (powerups[i].y > canvas.height) {
            powerups.splice(i, 1);
        }
    }
}

// Draw powerups
function drawPowerups() {
    powerups.forEach(pu => {
        if (pu.type === 'SPEED_BOOST') {
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(pu.x + 15, pu.y + 15, 15, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#000';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('⚡', pu.x + 15, pu.y + 22);
        }
    });
}

// Check for collisions
function checkCollisions() {
    // Check car collisions
    opponentCars.forEach(car => {
        if (isColliding(playerCar, car)) {
            gameOver();
        }
    });
    
    // Check powerup collisions
    for (let i = powerups.length - 1; i >= 0; i--) {
        if (isColliding(playerCar, powerups[i])) {
            if (powerups[i].type === 'SPEED_BOOST') {
                activateSpeedBoost();
            }
            powerups.splice(i, 1);
        }
    }
}

// Activate speed boost
function activateSpeedBoost() {
    speedBoostActive = true;
    maxSpeed = 8;
    speedBoostEndTime = Date.now() + 5000; // 5 seconds
    sounds.boost.play();
}

// Collision detection
function isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Game over
function gameOver() {
    gameRunning = false;
    sounds.engine.pause();
    sounds.engine.currentTime = 0;
    sounds.crash.play();
    mainMenu.style.display = 'flex';
    mainMenu.innerHTML = `
        <h1 class="text-5xl font-bold mb-8">GAME OVER</h1>
        <p class="text-2xl mb-8">Score: ${Math.floor(score)}</p>
        <button id="restartBtn" class="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-xl font-semibold">
            PLAY AGAIN
        </button>
    `;
    document.getElementById('restartBtn').addEventListener('click', startGame);
}

// Initialize game when loaded
window.addEventListener('load', initGame);
window.addEventListener('keydown', handleKeyDown);
