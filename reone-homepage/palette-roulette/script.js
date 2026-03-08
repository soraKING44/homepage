// =====================================================================
// --- 初期設定 ---
// =====================================================================

// --- DOM要素の取得 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');
const jumpButton = document.getElementById('jumpButton');

// --- 画像の読み込み ---
const playerImage = new Image();
playerImage.src = 'image1.png';

// --- ゲーム設定 (定数) ---
const isMobile = window.innerWidth <= 768;
const scale = isMobile ? 0.5 : 1.0;
const CONFIG = {
    GRAVITY: 0.6 * scale,
    GAME_INITIAL_SPEED: 5 * scale,
    GAME_SPEED_INCREMENT: 0.5 * scale,
    GAME_SPEED_INTERVAL: 500,
    PLAYER: {
        HEIGHT: 120 * scale,
        ASPECT_RATIO: 920 / 1500,
        get WIDTH() { return this.HEIGHT * this.ASPECT_RATIO; },
        X_POSITION: 100 * scale,
        JUMP_NORMAL_FORCE: -12 * scale,
        JUMP_HIGH_FORCE: -16 * scale,
        LONG_PRESS_THRESHOLD: 150
    },
    GROUND: { HEIGHT: 80 * scale, COLOR: '#000000' },
    OBSTACLE: { 
        MIN_GAP: 250 * scale, MAX_GAP: 500 * scale, 
        MIN_DISTANCE_FROM_EDGE: 300 * scale, 
        BLOCK: { WIDTH: 80 * scale, HEIGHT: 80 * scale, COLOR: 'green' }, 
        PIT: { MIN_WIDTH: 150 * scale, MAX_WIDTH: 300 * scale } 
    },
    BACKGROUND: { 
        COLOR: '#ffffff', 
        SUN: { X: 100 * scale, Y: 100 * scale, RADIUS: 40 * scale, FILL_COLOR: '#f0f0f0', STROKE_COLOR: '#000000', LINE_WIDTH: 2 * scale }, 
        CLOUD_SPEED_FACTOR: 0.2 
    },
    UI: { 
        SCORE_FONT: `${24 * scale}px sans-serif`,
        SCORE_COLOR: 'black', 
        SCORE_X: 20 * scale, 
        SCORE_Y: 40 * scale 
    }
};

// --- ゲームの状態を管理する変数 ---
let player, ground, obstacles, sun, clouds;
let score, gameSpeed, frameCount, isGameOver, pressStartTime;
let totalTopScroll, totalBottomScroll;
let finalPlayerX, finalTopColor, finalBottomColor;

// =====================================================================
// --- クラス定義 ---
// =====================================================================

class Player {
    constructor() { this.x = CONFIG.PLAYER.X_POSITION; this.y = canvas.height; this.width = CONFIG.PLAYER.WIDTH; this.height = CONFIG.PLAYER.HEIGHT; this.velocityY = 0; this.isOnGround = false; this.highJumpBoosted = false; }
    draw() { ctx.save(); ctx.scale(-1, 1); ctx.drawImage(playerImage, -this.x - this.width, this.y, this.width, this.height); ctx.restore(); }
    update() {
        if (!this.isOnGround) { this.velocityY += CONFIG.GRAVITY; this.y += this.velocityY; }
        const onPit = obstacles.some(o => o.type === 'pit' && (this.x + this.width / 2) > o.x && (this.x + this.width / 2) < (o.x + o.width));
        if (!onPit && this.y + this.height >= ground.y) { this.y = ground.y - this.height; this.velocityY = 0; this.isOnGround = true; this.highJumpBoosted = false; }
        else if (onPit) { this.isOnGround = false; }
    }
    jump(force) { if (this.isOnGround) { this.velocityY = force; this.isOnGround = false; } }
}

class Ground {
    constructor() { this.height = CONFIG.GROUND.HEIGHT; this.y = canvas.height - this.height; }
    draw() { ctx.fillStyle = CONFIG.GROUND.COLOR; ctx.fillRect(0, this.y, canvas.width, this.height); }
}

class Obstacle {
    constructor(type, x, y, width, height) { this.type = type; this.x = x; this.y = y; this.width = width; this.height = height; this.passed = false; }
    draw() { if (this.type === 'block') { ctx.fillStyle = CONFIG.OBSTACLE.BLOCK.COLOR; ctx.fillRect(this.x, this.y, this.width, this.height); } }
    update() { this.x -= gameSpeed; }
}

class Sun {
    constructor() { this.x = CONFIG.BACKGROUND.SUN.X; this.y = CONFIG.BACKGROUND.SUN.Y; this.radius = CONFIG.BACKGROUND.SUN.RADIUS; }
    draw() { const conf = CONFIG.BACKGROUND.SUN; ctx.fillStyle = conf.FILL_COLOR; ctx.strokeStyle = conf.STROKE_COLOR; ctx.lineWidth = conf.LINE_WIDTH; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
}

class Cloud {
    constructor(x, y, size) { this.x = x; this.y = y; this.size = size; }
    draw() { const conf = CONFIG.BACKGROUND.SUN; ctx.fillStyle = conf.FILL_COLOR; ctx.strokeStyle = conf.STROKE_COLOR; ctx.lineWidth = conf.LINE_WIDTH; ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.bezierCurveTo(this.x - (this.size * 0.8), this.y - (this.size * 0.8), this.x + (this.size * 0.2), this.y - (this.size * 1.2), this.x + (this.size * 1.6), this.y - (this.size * 0.6)); ctx.bezierCurveTo(this.x + (this.size * 3), this.y, this.x + (this.size * 1.8), this.y + (this.size * 0.6), this.x + (this.size * 1.2), this.y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    update() { this.x -= gameSpeed * CONFIG.BACKGROUND.CLOUD_SPEED_FACTOR; if (this.x + this.size * 3 < 0) { this.x = canvas.width; } }
}

// =====================================================================
// --- ゲームロジック関数 ---
// =====================================================================

function init() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    jumpButton.style.display = 'none';

    player = new Player();
    ground = new Ground();
    sun = new Sun();
    clouds = Array.from({ length: Math.ceil(canvas.width / 400) }, () => new Cloud(Math.random() * canvas.width, Math.random() * (canvas.height / 3) + 50, Math.random() * 20 + 20));
    obstacles = [];
    score = 0;
    gameSpeed = CONFIG.GAME_INITIAL_SPEED;
    frameCount = 0;
    isGameOver = false;
    pressStartTime = 0;
    totalTopScroll = 0;
    totalBottomScroll = 0;
    gameOverScreen.style.display = 'none';
    generateObstacle();
}

function generateObstacle() {
    const { MIN_GAP, MAX_GAP, BLOCK, PIT } = CONFIG.OBSTACLE;
    const gap = Math.random() * (MAX_GAP - MIN_GAP) + MIN_GAP;
    const lastObstacle = obstacles[obstacles.length - 1];
    const newX = lastObstacle ? lastObstacle.x + lastObstacle.width + gap : canvas.width + 100;

    if (Math.random() > 0.5) {
        let y = (Math.random() > 0.5) ? ground.y - BLOCK.HEIGHT : ground.y - CONFIG.PLAYER.HEIGHT - BLOCK.HEIGHT - 5;
        obstacles.push(new Obstacle('block', newX, y, BLOCK.WIDTH, BLOCK.HEIGHT));
    } else {
        const width = Math.random() * (PIT.MAX_WIDTH - PIT.MIN_WIDTH) + PIT.MIN_WIDTH;
        obstacles.push(new Obstacle('pit', newX, ground.y, width, ground.height));
    }
}

function checkCollisions() {
    for (const obstacle of obstacles) {
        if (obstacle.type === 'block' && player.x < obstacle.x + obstacle.width && player.x + player.width > obstacle.x && player.y < obstacle.y + obstacle.height && player.y + player.height > obstacle.y) {
            setGameOver();
            return;
        }
    }
    if (player.y > canvas.height) { setGameOver(); }
}

function setGameOver() {
    if (isGameOver) return;
    isGameOver = true;
    jumpButton.style.display = 'none';
    finalScoreElement.textContent = score;
    finalPlayerX = player.x + (player.width / 2);

    const bandWidth = window.innerWidth * 2;
    
    const bottomRatio = (Math.abs(totalBottomScroll) + finalPlayerX) % bandWidth / bandWidth;
    finalBottomColor = getColorFromGradient(bottomRatio);
    document.getElementById('finalBottomColor').style.backgroundColor = finalBottomColor;
    document.getElementById('finalBottomColorHex').textContent = finalBottomColor;

    const topRatio = (Math.abs(totalTopScroll) + finalPlayerX) % bandWidth / bandWidth;
    finalTopColor = getColorFromGradient(topRatio);
    document.getElementById('finalTopColor').style.backgroundColor = finalTopColor;
    document.getElementById('finalTopColorHex').textContent = finalTopColor;

    gameOverScreen.style.display = 'block';
}

function getColorFromGradient(ratio) {
    const colors = [
        { r: 255, g: 0, b: 0 },    // Red
        { r: 255, g: 165, b: 0 },  // Orange
        { r: 255, g: 255, b: 0 },  // Yellow
        { r: 130, g: 102, b: 68 }, // Brown (Earth)
        { r: 0, g: 255, b: 0 },    // Lime
        { r: 0, g: 255, b: 255 },  // Cyan
        { r: 192, g: 160, b: 128 },// Light Brown (Earth)
        { r: 0, g: 0, b: 255 },    // Blue
        { r: 255, g: 0, b: 255 },  // Magenta
        { r: 74, g: 64, b: 58 },   // Dark Brown (Earth)
        { r: 255, g: 0, b: 0 }     // Red (loop)
    ];
    const colorStop = ratio * (colors.length - 1);
    const startIndex = Math.floor(colorStop);
    const endIndex = Math.min(startIndex + 1, colors.length - 1);
    const localRatio = colorStop - startIndex;
    const r = Math.round(colors[startIndex].r + (colors[endIndex].r - colors[startIndex].r) * localRatio);
    const g = Math.round(colors[startIndex].g + (colors[endIndex].g - colors[startIndex].g) * localRatio);
    const b = Math.round(colors[startIndex].b + (colors[endIndex].b - colors[startIndex].b) * localRatio);
    return `rgb(${r}, ${g}, ${b})`;
}

// =====================================================================
// --- 更新と描画 ---
// =====================================================================

function update() {
    if (pressStartTime > 0 && !player.isOnGround && !player.highJumpBoosted && (Date.now() - pressStartTime > CONFIG.PLAYER.LONG_PRESS_THRESHOLD)) {
        player.velocityY = CONFIG.PLAYER.JUMP_HIGH_FORCE;
        player.highJumpBoosted = true;
    }
    player.update();
    clouds.forEach(c => c.update());
    obstacles.forEach(o => {
        o.update();
        if (!o.passed && o.x + o.width < player.x) { score++; o.passed = true; }
    });
    obstacles = obstacles.filter(o => o.x + o.width > 0);
    if (canvas.width - obstacles[obstacles.length - 1].x > CONFIG.OBSTACLE.MIN_DISTANCE_FROM_EDGE) { generateObstacle(); }
    frameCount++;
    if (frameCount % CONFIG.GAME_SPEED_INTERVAL === 0) { gameSpeed += CONFIG.GAME_SPEED_INCREMENT; }

    window.parent.postMessage({ type: 'scrollUpdate', bottomSpeed: gameSpeed, topSpeed: gameSpeed * CONFIG.BACKGROUND.CLOUD_SPEED_FACTOR }, '*');
    totalBottomScroll += gameSpeed;
    totalTopScroll += gameSpeed * CONFIG.BACKGROUND.CLOUD_SPEED_FACTOR;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    sun.draw();
    clouds.forEach(c => c.draw());
    ground.draw();
    
    // 穴を描画
    ctx.fillStyle = CONFIG.BACKGROUND.COLOR;
    obstacles.forEach(o => { if (o.type === 'pit') ctx.fillRect(o.x, o.y, o.width, o.height); });
    
    obstacles.forEach(o => o.draw());
    player.draw();
    
    // スコア描画
    ctx.fillStyle = CONFIG.UI.SCORE_COLOR;
    ctx.font = CONFIG.UI.SCORE_FONT;
    ctx.textAlign = 'left';
    ctx.fillText(`スコア: ${score}`, CONFIG.UI.SCORE_X, CONFIG.UI.SCORE_Y);

    // ゲームオーバー時に縦線を描画
    if (isGameOver) {
        ctx.save();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(finalPlayerX, 0);
        ctx.lineTo(finalPlayerX, canvas.height);
        ctx.stroke();
        
        ctx.restore();
    }
}

// =====================================================================
// --- メインループとイベントハンドラ ---
// =====================================================================

function gameLoop() {
    if (!isGameOver) {
        update();
        checkCollisions();
        requestAnimationFrame(gameLoop);
    }
    draw();
}

function handlePressStart(e) { e.preventDefault(); if (!isGameOver && player && player.isOnGround) { player.jump(CONFIG.PLAYER.JUMP_NORMAL_FORCE); pressStartTime = Date.now(); } }
function handlePressEnd(e) { e.preventDefault(); if (!isGameOver) pressStartTime = 0; }
function handleJumpButtonPressStart(e) { e.preventDefault(); handlePressStart(e); }
function handleJumpButtonPressEnd(e) { e.preventDefault(); handlePressEnd(e); }
function returnHome() {
    window.parent.postMessage({
        type: 'setThemeColors',
        mainColor: finalBottomColor,
        subColor: finalTopColor
    }, '*');
    window.parent.postMessage('closeGameModal', '*');
}

function updateButtonVisibility() {
    if (window.innerWidth <= 768) {
        jumpButton.style.display = 'block';
    } else {
        jumpButton.style.display = 'none';
    }
}

function setupEventListeners() {

    if (window.matchMedia('(pointer: fine)').matches) {
        window.addEventListener('mousedown', handlePressStart);
        window.addEventListener('mouseup', handlePressEnd);
    }

    jumpButton.addEventListener('mousedown', handleJumpButtonPressStart);
    jumpButton.addEventListener('mouseup', handleJumpButtonPressEnd);
    jumpButton.addEventListener('touchstart', handleJumpButtonPressStart, { passive: false });
    jumpButton.addEventListener('touchend', handleJumpButtonPressEnd, { passive: false });
    restartButton.addEventListener('click', returnHome);

    window.addEventListener('resize', () => {
        init();
        // updateButtonVisibility();
    });
}

// --- ゲーム開始 ---
function startGame() {
    startScreen.style.display = 'none';
    init();
    if (window.innerWidth <= 768) {
        jumpButton.style.display = 'block';
    }

    gameLoop();
}

playerImage.onload = () => {
    setupEventListeners();
    startButton.addEventListener('click', startGame);
};
if (playerImage.complete) {
    playerImage.onload();
}
