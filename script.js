/**
 * AUDIO MANAGER 
 * Generates retro-synth sounds using Web Audio API
 */
const AudioMgr = {
    ctx: null,
    init() { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },

    playPop() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    },

    playShoot() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }
};

/**
 * UPDATE STATUS ICON
 * Changes the mode indicator icon based on current state
 */
function updateStatusIcon(mode) {
    const statusIcon = document.getElementById('statusIcon');
    const modeTxt = document.getElementById('modeText');
    const handVisualizer = document.getElementById('handVisualizer');
    const handGesture = document.getElementById('handGesture');
    const gestureHint = document.getElementById('gestureHint');

    // Remove all animation classes
    statusIcon.classList.remove('spinning', 'charging', 'fire');

    switch (mode) {
        case 'WAITING':
            statusIcon.className = 'fas fa-circle-notch status-icon spinning';
            statusIcon.style.color = 'var(--neon-blue)';
            modeTxt.style.color = 'var(--neon-blue)';
            handVisualizer.classList.remove('show');
            break;
        case 'READY':
            statusIcon.className = 'fas fa-hand-paper status-icon';
            statusIcon.style.color = '#00ff88';
            modeTxt.style.color = '#00ff88';
            // Keep visualizer visible for 2 seconds when hand is first detected
            if (!lastHandDetected) {
                handVisualizer.classList.add('show');
                handGesture.innerHTML = '';
                handGesture.className = 'fas fa-hand-lizard hand-gesture';
                gestureHint.textContent = 'PINCH TO GRAB';

                // Clear any existing timeout
                if (handVisualizerTimeout) {
                    clearTimeout(handVisualizerTimeout);
                }

                // Hide after 2 seconds
                handVisualizerTimeout = setTimeout(() => {
                    handVisualizer.classList.remove('show');
                }, 2000);
            }
            lastHandDetected = true;
            lastPinching = false;
            break;
        case 'NO HAND':
            statusIcon.className = 'fas fa-exclamation-triangle status-icon';
            statusIcon.style.color = '#FFD700';
            modeTxt.style.color = '#FFD700';
            handVisualizer.classList.add('show');
            handGesture.className = 'fas fa-hand-rock hand-gesture';
            gestureHint.textContent = 'SHOW YOUR HAND';
            lastHandDetected = false;

            // Clear timeouts if hand is lost
            if (handVisualizerTimeout) {
                clearTimeout(handVisualizerTimeout);
                handVisualizerTimeout = null;
            }
            if (releaseHintTimeout) {
                clearTimeout(releaseHintTimeout);
                releaseHintTimeout = null;
            }
            break;
        case 'CHARGING':
            statusIcon.className = 'fas fa-bolt status-icon charging';
            statusIcon.style.color = 'var(--neon-blue)';
            modeTxt.style.color = 'var(--neon-blue)';

            // Show visualizer for 4 seconds when first starting to charge
            if (!lastPinching) {
                handVisualizer.classList.add('show');
                handGesture.className = 'fas fa-up-down-left-right hand-gesture';
                gestureHint.textContent = 'MOVE TO AIM';

                // Clear any existing timeouts
                if (handVisualizerTimeout) {
                    clearTimeout(handVisualizerTimeout);
                }
                if (releaseHintTimeout) {
                    clearTimeout(releaseHintTimeout);
                }

                // After 2 seconds, change to "RELEASE!" hint
                releaseHintTimeout = setTimeout(() => {
                    handGesture.className = 'fas fa-hand-sparkles hand-gesture';
                    gestureHint.textContent = 'RELEASE!';
                }, 2000);

                // Hide after 4 seconds total (giving 2 seconds to see RELEASE! message)
                handVisualizerTimeout = setTimeout(() => {
                    handVisualizer.classList.remove('show');
                }, 4000);
            }
            lastPinching = true;
            break;
        case 'FIRE':
            statusIcon.className = 'fas fa-rocket status-icon fire';
            statusIcon.style.color = 'var(--neon-pink)';
            modeTxt.style.color = 'var(--neon-pink)';
            handVisualizer.classList.remove('show');
            handGesture.className = 'fas fa-hand-sparkles hand-gesture';
            gestureHint.textContent = 'RELEASE!';
            break;
        case 'GAME OVER':
            statusIcon.className = 'fas fa-skull-crossbones status-icon';
            statusIcon.style.color = 'var(--neon-pink)';
            modeTxt.style.color = 'var(--neon-pink)';
            handVisualizer.classList.remove('show');
            break;
        case 'CAMERA ERROR':
            statusIcon.className = 'fas fa-video-slash status-icon';
            statusIcon.style.color = '#ff0000';
            modeTxt.style.color = '#ff0000';
            handVisualizer.classList.add('show');
            gestureHint.textContent = 'CAMERA ACCESS REQUIRED';
            break;
    }
}

// Game Constants & State
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const BUBBLE_RADIUS = 22;
const SHOOT_POS = { x: 400, y: 520 };
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', '#BB8FCE'];

let canvas, ctx, nextCtx;
let grid = [], particles = [];
let currentBubble, nextBubble;
let score = 0, highScore = 0, gameState = 'waiting';
let isPinching = false;
let aimVector = { x: 0, y: 0 };
let bounceCount = 0;
let handVisualizerTimeout = null;
let releaseHintTimeout = null;
let lastHandDetected = false;
let lastPinching = false;
let shotStartTime = 0;
const MAX_BOUNCES = 10;
const MAX_SHOT_TIME = 5000; // 5 seconds max per shot

function loadHighScore() {
    const saved = localStorage.getItem('bubbleShooterHighScore');
    highScore = saved ? parseInt(saved, 10) : 0;
}

function saveHighScore() {
    localStorage.setItem('bubbleShooterHighScore', highScore.toString());
}

function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    nextCtx = document.getElementById('nextBubbleCanvas').getContext('2d');

    loadHighScore();
    initGrid();
    currentBubble = createBubble(SHOOT_POS.x, SHOOT_POS.y);
    nextBubble = createBubble(30, 30);
    drawNextPreview();
    requestAnimationFrame(gameLoop);
}

function initGrid() {
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 14; col++) {
            grid.push({
                x: 60 + col * (BUBBLE_RADIUS * 2.1) + (row % 2 * BUBBLE_RADIUS),
                y: 60 + row * (BUBBLE_RADIUS * 1.8),
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                active: true
            });
        }
    }
}

function createBubble(x, y) {
    return { x, y, color: COLORS[Math.floor(Math.random() * COLORS.length)], vx: 0, vy: 0 };
}

function drawNextPreview() {
    nextCtx.clearRect(0, 0, 60, 60);
    const grad = nextCtx.createRadialGradient(30, 30, 5, 30, 30, 25);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.4, nextBubble.color);
    grad.addColorStop(1, 'transparent');
    nextCtx.fillStyle = grad;
    nextCtx.beginPath();
    nextCtx.arc(30, 30, 18, 0, Math.PI * 2);
    nextCtx.fill();
}

function startGame() {
    AudioMgr.init();
    loadHighScore();
    updateHighScoreDisplay();
    document.getElementById('overlay').style.display = 'none';
    init();
    setupHands();
    updateStatusIcon('WAITING');
}

function updateHighScoreDisplay() {
    const highScoreElement = document.getElementById('highScoreValue');
    if (highScoreElement) {
        highScoreElement.textContent = highScore.toString().padStart(4, '0');
    }
}

/** * HAND TRACKING LOGIC 
 */
function setupHands() {
    const video = document.getElementById('webcam');
    const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`
    });
    hands.setOptions({
        maxNumHands: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        modelComplexity: 0
    });
    hands.onResults(onHandResults);

    const camera = new Camera(video, {
        onFrame: async () => {
            await hands.send({ image: video });
        },
        width: 640,
        height: 480
    });
    camera.start().catch(err => {
        console.error("Camera error:", err);
        document.getElementById('modeText').textContent = "CAMERA ERROR";
    });
}

function onHandResults(res) {
    const frame = document.getElementById('webcamFrame');
    const modeTxt = document.getElementById('modeText');
    const skeletonCanvas = document.getElementById('skeletonCanvas');
    const skeletonCtx = skeletonCanvas.getContext('2d');

    // Clear skeleton canvas
    skeletonCtx.clearRect(0, 0, skeletonCanvas.width, skeletonCanvas.height);

    if (res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
        frame.classList.add('active');
        const landmarks = res.multiHandLandmarks[0];

        // Draw hand skeleton
        drawHandSkeleton(skeletonCtx, landmarks, skeletonCanvas.width, skeletonCanvas.height);

        const thumb = landmarks[4];
        const index = landmarks[8];

        const dist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
        const wasPinching = isPinching;
        isPinching = dist < 0.05;

        // Visual Aiming
        if (isPinching && gameState === 'waiting') {
            const pullX = (0.5 - index.x) * 600;
            const pullY = (index.y - 0.5) * 600;
            aimVector = { x: pullX, y: -Math.abs(pullY) };

            document.getElementById('powerIndicator').style.display = 'block';
            document.getElementById('powerFill').style.width = Math.min(Math.abs(pullY) / 2, 100) + '%';
            modeTxt.textContent = "CHARGING";
            updateStatusIcon('CHARGING');
        }

        if (!isPinching && wasPinching && gameState === 'waiting') {
            fire();
        }

        // Update status when hand is detected but not pinching
        if (!isPinching && gameState === 'waiting') {
            modeTxt.textContent = "READY";
            updateStatusIcon('READY');
        }
    } else {
        frame.classList.remove('active');
        if (gameState === 'waiting') {
            modeTxt.textContent = "NO HAND";
            updateStatusIcon('NO HAND');
        }
    }
}

function drawHandSkeleton(skeletonCtx, landmarks, width, height) {
    // Hand bone connections
    const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],           // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8],           // Index
        [0, 9], [9, 10], [10, 11], [11, 12],      // Middle
        [0, 13], [13, 14], [14, 15], [15, 16],    // Ring
        [0, 17], [17, 18], [18, 19], [19, 20],    // Pinky
        [5, 9], [9, 13], [13, 17]                 // Palm
    ];

    // Draw connections
    skeletonCtx.strokeStyle = isPinching ? '#00ff88' : '#00f2ff';
    skeletonCtx.lineWidth = 3;
    skeletonCtx.shadowBlur = 5;
    skeletonCtx.shadowColor = isPinching ? '#00ff88' : '#00f2ff';

    connections.forEach(([i, j]) => {
        const start = landmarks[i];
        const end = landmarks[j];

        skeletonCtx.beginPath();
        skeletonCtx.moveTo(start.x * width, start.y * height);
        skeletonCtx.lineTo(end.x * width, end.y * height);
        skeletonCtx.stroke();
    });

    skeletonCtx.shadowBlur = 0;

    // Draw landmark points
    landmarks.forEach((landmark, index) => {
        const x = landmark.x * width;
        const y = landmark.y * height;

        let color = '#ffffff';
        let radius = 4;

        // Highlight thumb and index finger tips
        if (index === 4 || index === 8) {
            color = isPinching ? '#00ff88' : '#f5576c';
            radius = 6;
            skeletonCtx.shadowBlur = 10;
            skeletonCtx.shadowColor = color;
        }

        skeletonCtx.fillStyle = color;
        skeletonCtx.beginPath();
        skeletonCtx.arc(x, y, radius, 0, Math.PI * 2);
        skeletonCtx.fill();

        skeletonCtx.shadowBlur = 0;
    });
}

function fire() {
    AudioMgr.playShoot();
    currentBubble.vx = aimVector.x * 0.1;
    currentBubble.vy = aimVector.y * 0.1;
    gameState = 'shooting';
    bounceCount = 0;
    shotStartTime = Date.now();
    document.getElementById('powerIndicator').style.display = 'none';
    document.getElementById('modeText').textContent = "FIRE";
    updateStatusIcon('FIRE');
}

/**
 * GAME LOOP
 */
function gameLoop() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Grid
    grid.forEach(b => {
        if (!b.active) return;
        ctx.beginPath();
        ctx.arc(b.x, b.y, BUBBLE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = b.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // Draw aiming arrow when charging
    if (gameState === 'waiting' && isPinching && aimVector.y !== 0) {
        drawAimingArrow();
    }

    // Handle Shooting
    if (gameState === 'shooting') {
        currentBubble.x += currentBubble.vx;
        currentBubble.y += currentBubble.vy;

        // Wall Bounce
        if (currentBubble.x - BUBBLE_RADIUS < 0 || currentBubble.x + BUBBLE_RADIUS > CANVAS_WIDTH) {
            currentBubble.vx *= -1;
            currentBubble.x = Math.max(BUBBLE_RADIUS, Math.min(CANVAS_WIDTH - BUBBLE_RADIUS, currentBubble.x));
            bounceCount++;
        }

        // Collision Check with grid bubbles
        let hasCollision = false;
        for (const target of grid) {
            if (target.active && Math.hypot(currentBubble.x - target.x, currentBubble.y - target.y) < BUBBLE_RADIUS * 2 - 2) {
                hasCollision = true;
                break;
            }
        }

        // Top collision
        if (currentBubble.y - BUBBLE_RADIUS < 40) {
            hasCollision = true;
        }

        // Check if ball has been bouncing too long or too many times
        const shotDuration = Date.now() - shotStartTime;
        const isEndlessBounce = bounceCount > MAX_BOUNCES || shotDuration > MAX_SHOT_TIME;

        // Check if ball is out of bounds (below screen)
        const isOutOfBounds = currentBubble.y > CANVAS_HEIGHT + BUBBLE_RADIUS;

        // Handle different end conditions
        if (hasCollision) {
            snapBubbleToGrid();
        } else if (isEndlessBounce) {
            console.log('Ball bouncing endlessly - forcing snap', { bounceCount, shotDuration });
            snapBubbleToGrid();
        } else if (isOutOfBounds) {
            console.log('Ball went out of bounds (bottom)');
            resetShooter();
            checkGameOver();
        }
    }

    // Draw Shooter (always draw it before ending the frame)
    if (gameState === 'shooting' || gameState === 'waiting') {
        ctx.beginPath();
        ctx.arc(currentBubble.x, currentBubble.y, BUBBLE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = currentBubble.color;
        ctx.fill();
    }

    requestAnimationFrame(gameLoop);
}

function resetShooter() {
    currentBubble = createBubble(SHOOT_POS.x, SHOOT_POS.y);
    currentBubble.color = nextBubble.color;
    nextBubble = createBubble(30, 30);
    drawNextPreview();
    gameState = 'waiting';
    document.getElementById('modeText').textContent = "READY";
}

function snapBubbleToGrid() {
    // Find the closest valid grid position
    const spacing = BUBBLE_RADIUS * 2.1;
    const rowHeight = BUBBLE_RADIUS * 1.8;

    let closestRow = Math.round((currentBubble.y - 60) / rowHeight);
    closestRow = Math.max(0, closestRow);

    const offset = (closestRow % 2 === 1) ? BUBBLE_RADIUS : 0;
    let closestCol = Math.round((currentBubble.x - 60 - offset) / spacing);
    closestCol = Math.max(0, Math.min(closestCol, 13 - (closestRow % 2)));

    const targetX = 60 + closestCol * spacing + offset;
    const targetY = 60 + closestRow * rowHeight;

    // Check if this position is already occupied
    const isOccupied = grid.some(b =>
        b.active && Math.hypot(b.x - targetX, b.y - targetY) < BUBBLE_RADIUS
    );

    if (isOccupied) {
        // Find nearest empty position
        const candidates = [];
        for (let dr = 0; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                const testRow = closestRow + dr;
                const testCol = closestCol + dc;

                if (testRow < 0 || testCol < 0 || testCol > 13 - (testRow % 2)) continue;

                const testOffset = (testRow % 2 === 1) ? BUBBLE_RADIUS : 0;
                const testX = 60 + testCol * spacing + testOffset;
                const testY = 60 + testRow * rowHeight;

                const occupied = grid.some(b =>
                    b.active && Math.hypot(b.x - testX, b.y - testY) < BUBBLE_RADIUS
                );

                if (!occupied) {
                    const dist = Math.hypot(testX - currentBubble.x, testY - currentBubble.y);
                    candidates.push({ row: testRow, col: testCol, x: testX, y: testY, dist });
                }
            }
        }

        if (candidates.length === 0) {
            resetShooter();
            return;
        }

        candidates.sort((a, b) => a.dist - b.dist);
        const best = candidates[0];

        grid.push({
            x: best.x,
            y: best.y,
            color: currentBubble.color,
            active: true
        });

        checkMatches(best.x, best.y);
    } else {
        grid.push({
            x: targetX,
            y: targetY,
            color: currentBubble.color,
            active: true
        });

        checkMatches(targetX, targetY);
    }

    resetShooter();
    checkGameOver();
}

function checkMatches(x, y) {
    const matches = findMatchingBubbles(x, y);

    if (matches.length >= 3) {
        matches.forEach(bubble => {
            bubble.active = false;
            popEffect(bubble.x, bubble.y, bubble.color);
            score += 100;
        });
        document.getElementById('scoreValue').textContent = score.toString().padStart(4, '0');

        // Remove floating bubbles
        removeFloatingBubbles();
    }
}

function findMatchingBubbles(x, y) {
    const targetBubble = grid.find(b => b.active && b.x === x && b.y === y);
    if (!targetBubble) return [];

    const matches = [];
    const visited = new Set();
    const queue = [targetBubble];
    const color = targetBubble.color;

    while (queue.length > 0) {
        const current = queue.shift();
        const key = `${current.x},${current.y}`;

        if (visited.has(key)) continue;
        visited.add(key);
        matches.push(current);

        // Find neighbors
        grid.forEach(bubble => {
            if (!bubble.active || bubble.color !== color) return;

            const dist = Math.hypot(bubble.x - current.x, bubble.y - current.y);
            if (dist > 1 && dist < BUBBLE_RADIUS * 2.5) {
                const bubbleKey = `${bubble.x},${bubble.y}`;
                if (!visited.has(bubbleKey)) {
                    queue.push(bubble);
                }
            }
        });
    }

    return matches;
}

function removeFloatingBubbles() {
    const connected = new Set();
    const queue = [];

    // Start with top row bubbles
    grid.forEach(bubble => {
        if (bubble.active && bubble.y < 80) {
            const key = `${bubble.x},${bubble.y}`;
            connected.add(key);
            queue.push(bubble);
        }
    });

    // BFS to find all connected bubbles
    while (queue.length > 0) {
        const current = queue.shift();

        grid.forEach(bubble => {
            if (!bubble.active) return;

            const dist = Math.hypot(bubble.x - current.x, bubble.y - current.y);
            const key = `${bubble.x},${bubble.y}`;

            if (dist > 1 && dist < BUBBLE_RADIUS * 2.5 && !connected.has(key)) {
                connected.add(key);
                queue.push(bubble);
            }
        });
    }

    // Remove unconnected bubbles
    grid.forEach(bubble => {
        const key = `${bubble.x},${bubble.y}`;
        if (bubble.active && !connected.has(key)) {
            bubble.active = false;
            popEffect(bubble.x, bubble.y, bubble.color);
            score += 50;
        }
    });

    if (connected.size < grid.filter(b => b.active).length) {
        document.getElementById('scoreValue').textContent = score.toString().padStart(4, '0');
    }
}

function drawAimingArrow() {
    const magnitude = Math.sqrt(aimVector.x * aimVector.x + aimVector.y * aimVector.y);
    const normalizedX = aimVector.x / magnitude;
    const normalizedY = aimVector.y / magnitude;

    const arrowLength = Math.min(magnitude * 0.5, 150);
    const endX = SHOOT_POS.x + normalizedX * arrowLength;
    const endY = SHOOT_POS.y + normalizedY * arrowLength;

    // Draw arrow line with gradient
    const gradient = ctx.createLinearGradient(SHOOT_POS.x, SHOOT_POS.y, endX, endY);
    gradient.addColorStop(0, 'rgba(0, 242, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(245, 87, 108, 0.8)');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f2ff';

    // Draw dashed line
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(SHOOT_POS.x, SHOOT_POS.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw arrowhead
    const arrowHeadLength = 15;
    const angle = Math.atan2(normalizedY, normalizedX);

    ctx.fillStyle = '#f5576c';
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
        endX - arrowHeadLength * Math.cos(angle - Math.PI / 6),
        endY - arrowHeadLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        endX - arrowHeadLength * Math.cos(angle + Math.PI / 6),
        endY - arrowHeadLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;

    // Draw power indicator on arrow
    const powerPercent = Math.min(Math.abs(aimVector.y) / 300 * 100, 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Rajdhani';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(powerPercent) + '%', endX, endY - 20);
}

function popEffect(x, y, color) {
    AudioMgr.playPop();
    // Simple combo text logic
    const combo = document.getElementById('comboText');
    combo.classList.add('show');
    setTimeout(() => combo.classList.remove('show'), 500);
}

function checkGameOver() {
    // Check if any active bubbles have reached the bottom danger zone
    const dangerZone = SHOOT_POS.y - BUBBLE_RADIUS * 3; // About 3 bubble heights from shooter
    const hasBubblesInDanger = grid.some(b => b.active && b.y > dangerZone);

    if (hasBubblesInDanger) {
        gameState = 'gameover';
        document.getElementById('modeText').textContent = 'GAME OVER';
        document.getElementById('modeText').style.color = 'var(--neon-pink)';
        updateStatusIcon('GAME OVER');

        // Update high score if current score is higher
        let isNewHighScore = false;
        if (score > highScore) {
            highScore = score;
            saveHighScore();
            isNewHighScore = true;
        }

        // Show overlay with game over message
        const overlay = document.getElementById('overlay');
        overlay.querySelector('h1').textContent = 'GAME OVER';
        const scoreText = isNewHighScore
            ? `NEW HIGH SCORE: ${score}!`
            : `SCORE: ${score} | HIGH SCORE: ${highScore}`;
        overlay.querySelector('p').textContent = scoreText;
        overlay.querySelector('button').textContent = 'RESTART';
        overlay.querySelector('button').onclick = () => location.reload();
        overlay.style.display = 'flex';
    }
}
