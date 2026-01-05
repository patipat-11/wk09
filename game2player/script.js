// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Canvas dimensions
canvas.width = 960;
canvas.height = 540;

// Game state
const game = {
    scoreLeft: 0,
    scoreRight: 0,
    timer: 90, // เวลาในวินาที
    isPlaying: true,
    isPaused: false,
    currentHalf: 1, // 1 = ครึ่งแรก, 2 = ครึ่งหลัง
    isHalftime: false,
    isOvertime: false,
    halftimeDuration: 3, // เวลาพักครึ่ง (วินาที)
    halftimeTimer: 0,
    lastTime: Date.now()
};

// Field dimensions
const field = {
    width: canvas.width,
    height: canvas.height,
    centerX: canvas.width / 2,
    centerY: canvas.height / 2,
    goalWidth: 100,
    goalHeight: 150,
    goalDepth: 20
};

// Player settings
const playerSize = 30;
const playerSpeed = 5;

// Player 1 (WASD) - Left side
const player1 = {
    x: field.width * 0.25,
    y: field.centerY,
    width: playerSize,
    height: playerSize,
    speed: playerSpeed,
    color: '#3498db',
    keys: {
        up: false,
        down: false,
        left: false,
        right: false
    }
};

// Player 2 (Arrow keys) - Right side
const player2 = {
    x: field.width * 0.75,
    y: field.centerY,
    width: playerSize,
    height: playerSize,
    speed: playerSpeed,
    color: '#e74c3c',
    keys: {
        up: false,
        down: false,
        left: false,
        right: false
    }
};

// Ball settings
const ball = {
    x: field.centerX,
    y: field.centerY,
    radius: 12,
    vx: 0,
    vy: 0,
    friction: 0.98,
    bounce: 0.4
};

// Input handling
const keys = {};

// Keyboard event listeners
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    // Player 1 controls (WASD)
    if (e.code === 'KeyW') player1.keys.up = true;
    if (e.code === 'KeyS') player1.keys.down = true;
    if (e.code === 'KeyA') player1.keys.left = true;
    if (e.code === 'KeyD') player1.keys.right = true;
    
    // Player 2 controls (Arrow keys)
    if (e.code === 'ArrowUp') player2.keys.up = true;
    if (e.code === 'ArrowDown') player2.keys.down = true;
    if (e.code === 'ArrowLeft') player2.keys.left = true;
    if (e.code === 'ArrowRight') player2.keys.right = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    
    // Player 1 controls
    if (e.code === 'KeyW') player1.keys.up = false;
    if (e.code === 'KeyS') player1.keys.down = false;
    if (e.code === 'KeyA') player1.keys.left = false;
    if (e.code === 'KeyD') player1.keys.right = false;
    
    // Player 2 controls
    if (e.code === 'ArrowUp') player2.keys.up = false;
    if (e.code === 'ArrowDown') player2.keys.down = false;
    if (e.code === 'ArrowLeft') player2.keys.left = false;
    if (e.code === 'ArrowRight') player2.keys.right = false;
});

// Helper function to calculate distance
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Helper function to check collision between player and ball
function checkPlayerBallCollision(player, ball) {
    const dist = distance(player.x, player.y, ball.x, ball.y);
    const minDist = player.width / 2 + ball.radius;
    return dist < minDist;
}

// Update player movement
function updatePlayer(player) {
    let dx = 0;
    let dy = 0;
    
    if (player.keys.up) dy -= player.speed;
    if (player.keys.down) dy += player.speed;
    if (player.keys.left) dx -= player.speed;
    if (player.keys.right) dx += player.speed;
    
    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }
    
    // Update position
    player.x += dx;
    player.y += dy;
    
    // Boundary check
    player.x = Math.max(player.width / 2, Math.min(field.width - player.width / 2, player.x));
    player.y = Math.max(player.height / 2, Math.min(field.height - player.height / 2, player.y));
}

// Update ball physics
function updateBall() {
    // Apply friction
    ball.vx *= ball.friction;
    ball.vy *= ball.friction;
    
    // Stop ball if speed is very low
    if (Math.abs(ball.vx) < 0.1) ball.vx = 0;
    if (Math.abs(ball.vy) < 0.1) ball.vy = 0;
    
    // Update position
    ball.x += ball.vx;
    ball.y += ball.vy;
    
    // Boundary collision (top and bottom)
    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy *= -ball.bounce;
    }
    if (ball.y + ball.radius > field.height) {
        ball.y = field.height - ball.radius;
        ball.vy *= -ball.bounce;
    }
    
    // Goal collision check
    // Left goal
    if (ball.x - ball.radius < field.goalDepth) {
        const goalTop = (field.height - field.goalHeight) / 2;
        const goalBottom = goalTop + field.goalHeight;
        if (ball.y >= goalTop && ball.y <= goalBottom) {
            // ตรวจสอบว่าใครทำประตู (ดูจากผู้เล่นที่ใกล้บอลที่สุด)
            const distToPlayer1 = distance(player1.x, player1.y, ball.x, ball.y);
            const distToPlayer2 = distance(player2.x, player2.y, ball.x, ball.y);
            
            // ถ้า player1 ใกล้บอลมากกว่า = player1 ทำเข้าประตูตัวเอง (own goal)
            // ถ้า player2 ใกล้บอลมากกว่า = player2 ทำประตูได้
            let goalScorer = distToPlayer1 < distToPlayer2 ? 'player1' : 'player2';
            let isOwnGoal = (goalScorer === 'player1');
            
            if (isOwnGoal) {
                // Own goal - player1 ทำเข้าประตูตัวเอง
                game.scoreRight++;
                document.getElementById('score-right').textContent = game.scoreRight;
                showGoalMessage('ผู้เล่น 1 ทำเข้าประตูตัวเอง!', true, 'left');
                
                if (game.isOvertime) {
                    endGame('player2');
                    return;
                }
            } else {
                // player2 ทำประตูได้
                game.scoreRight++;
                document.getElementById('score-right').textContent = game.scoreRight;
                showGoalMessage('ผู้เล่น 2 ทำประตูได้!', false, 'right');
                
                if (game.isOvertime) {
                    endGame('player2');
                    return;
                }
            }
            
            resetBall();
            resetPlayers();
            return;
        }
    }
    
    // Right goal
    if (ball.x + ball.radius > field.width - field.goalDepth) {
        const goalTop = (field.height - field.goalHeight) / 2;
        const goalBottom = goalTop + field.goalHeight;
        if (ball.y >= goalTop && ball.y <= goalBottom) {
            // ตรวจสอบว่าใครทำประตู
            const distToPlayer1 = distance(player1.x, player1.y, ball.x, ball.y);
            const distToPlayer2 = distance(player2.x, player2.y, ball.x, ball.y);
            
            // ถ้า player2 ใกล้บอลมากกว่า = player2 ทำเข้าประตูตัวเอง (own goal)
            // ถ้า player1 ใกล้บอลมากกว่า = player1 ทำประตูได้
            let goalScorer = distToPlayer1 < distToPlayer2 ? 'player1' : 'player2';
            let isOwnGoal = (goalScorer === 'player2');
            
            if (isOwnGoal) {
                // Own goal - player2 ทำเข้าประตูตัวเอง
                game.scoreLeft++;
                document.getElementById('score-left').textContent = game.scoreLeft;
                showGoalMessage('ผู้เล่น 2 ทำเข้าประตูตัวเอง!', true, 'right');
                
                if (game.isOvertime) {
                    endGame('player1');
                    return;
                }
            } else {
                // player1 ทำประตูได้
                game.scoreLeft++;
                document.getElementById('score-left').textContent = game.scoreLeft;
                showGoalMessage('ผู้เล่น 1 ทำประตูได้!', false, 'left');
                
                if (game.isOvertime) {
                    endGame('player1');
                    return;
                }
            }
            
            resetBall();
            resetPlayers();
            return;
        }
    }
    
    // Side walls (outside goals)
    if (ball.x - ball.radius < field.goalDepth) {
        ball.x = field.goalDepth + ball.radius;
        ball.vx *= -ball.bounce;
    }
    if (ball.x + ball.radius > field.width - field.goalDepth) {
        ball.x = field.width - field.goalDepth - ball.radius;
        ball.vx *= -ball.bounce;
    }
    
    // Collision with players
    if (checkPlayerBallCollision(player1, ball)) {
        const dist = distance(player1.x, player1.y, ball.x, ball.y);
        const overlap = player1.width / 2 + ball.radius - dist;
        const angle = Math.atan2(ball.y - player1.y, ball.x - player1.x);
        ball.x += Math.cos(angle) * overlap;
        ball.y += Math.sin(angle) * overlap;
        
        // Calculate player velocity
        let playerVx = 0;
        let playerVy = 0;
        if (player1.keys.up) playerVy -= player1.speed;
        if (player1.keys.down) playerVy += player1.speed;
        if (player1.keys.left) playerVx -= player1.speed;
        if (player1.keys.right) playerVx += player1.speed;
        
        // Normalize diagonal movement
        if (playerVx !== 0 && playerVy !== 0) {
            playerVx *= 0.707;
            playerVy *= 0.707;
        }
        
        // Push ball away with player velocity
        const pushPower = 8 + Math.sqrt(playerVx ** 2 + playerVy ** 2);
        ball.vx += Math.cos(angle) * pushPower;
        ball.vy += Math.sin(angle) * pushPower;
        
        // Limit max speed
        const maxSpeed = 20;
        const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
        if (speed > maxSpeed) {
            ball.vx = (ball.vx / speed) * maxSpeed;
            ball.vy = (ball.vy / speed) * maxSpeed;
        }
    }
    
    if (checkPlayerBallCollision(player2, ball)) {
        const dist = distance(player2.x, player2.y, ball.x, ball.y);
        const overlap = player2.width / 2 + ball.radius - dist;
        const angle = Math.atan2(ball.y - player2.y, ball.x - player2.x);
        ball.x += Math.cos(angle) * overlap;
        ball.y += Math.sin(angle) * overlap;
        
        // Calculate player velocity
        let playerVx = 0;
        let playerVy = 0;
        if (player2.keys.up) playerVy -= player2.speed;
        if (player2.keys.down) playerVy += player2.speed;
        if (player2.keys.left) playerVx -= player2.speed;
        if (player2.keys.right) playerVx += player2.speed;
        
        // Normalize diagonal movement
        if (playerVx !== 0 && playerVy !== 0) {
            playerVx *= 0.707;
            playerVy *= 0.707;
        }
        
        // Push ball away with player velocity
        const pushPower = 8 + Math.sqrt(playerVx ** 2 + playerVy ** 2);
        ball.vx += Math.cos(angle) * pushPower;
        ball.vy += Math.sin(angle) * pushPower;
        
        // Limit max speed
        const maxSpeed = 20;
        const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
        if (speed > maxSpeed) {
            ball.vx = (ball.vx / speed) * maxSpeed;
            ball.vy = (ball.vy / speed) * maxSpeed;
        }
    }
}

// Show goal message
function showGoalMessage(message, isOwnGoal, side) {
    const goalMessageElement = document.getElementById('goal-message');
    goalMessageElement.textContent = message;
    goalMessageElement.className = 'goal-message show';
    
    if (isOwnGoal) {
        goalMessageElement.classList.add('own-goal');
    } else if (side === 'left') {
        goalMessageElement.classList.add('goal-left');
    } else {
        goalMessageElement.classList.add('goal-right');
    }
    
    // หยุดเกมระหว่างแสดงข้อความ
    game.isPaused = true;
    
    // ซ่อนข้อความหลังจาก 1 วินาที
    setTimeout(() => {
        goalMessageElement.classList.remove('show');
        setTimeout(() => {
            goalMessageElement.className = 'goal-message';
            goalMessageElement.textContent = '';
            // ปลดล็อกเกมให้เล่นต่อ
            game.isPaused = false;
        }, 200);
    }, 1000);
}

// Reset ball to center
function resetBall() {
    ball.x = field.centerX;
    ball.y = field.centerY;
    ball.vx = 0;
    ball.vy = 0;
}

// Reset players to starting positions
function resetPlayers() {
    player1.x = field.width * 0.25;
    player1.y = field.centerY;
    player2.x = field.width * 0.75;
    player2.y = field.centerY;
}

// Draw field
function drawField() {
    // Field background (already green from canvas style)
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(0, 0, field.width, field.height);
    
    // Center line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(field.centerX, 0);
    ctx.lineTo(field.centerX, field.height);
    ctx.stroke();
    
    // Center circle
    ctx.beginPath();
    ctx.arc(field.centerX, field.centerY, 80, 0, Math.PI * 2);
    ctx.stroke();
    
    // Center point
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(field.centerX, field.centerY, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Left goal
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    const leftGoalTop = (field.height - field.goalHeight) / 2;
    ctx.strokeRect(0, leftGoalTop, field.goalDepth, field.goalHeight);
    
    // Right goal
    ctx.strokeRect(field.width - field.goalDepth, leftGoalTop, field.goalDepth, field.goalHeight);
    
    // Goal areas (penalty boxes)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    // Left penalty area
    ctx.strokeRect(0, field.height * 0.2, 120, field.height * 0.6);
    // Right penalty area
    ctx.strokeRect(field.width - 120, field.height * 0.2, 120, field.height * 0.6);
}

// Draw player
function drawPlayer(player) {
    ctx.save();
    ctx.translate(player.x, player.y);
    
    // Player body
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(0, 0, player.width / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Player border
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Direction indicator
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -player.width / 4, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// Draw ball
function drawBall() {
    // Ball shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(ball.x, ball.y + ball.radius + 2, ball.radius * 0.8, ball.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ball
    const gradient = ctx.createRadialGradient(
        ball.x - 3, ball.y - 3, 0,
        ball.x, ball.y, ball.radius
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#e67e22');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Ball pattern
    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius - 2, 0, Math.PI * 2);
    ctx.stroke();
    
    // Ball highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(ball.x - 4, ball.y - 4, 4, 0, Math.PI * 2);
    ctx.fill();
}

// Update game timer
function updateTimer() {
    if (game.isPaused || !game.isPlaying) return;
    
    const currentTime = Date.now();
    const deltaTime = (currentTime - game.lastTime) / 1000; // แปลงเป็นวินาที
    game.lastTime = currentTime;
    
    // ถ้าอยู่ในเวลาพักครึ่ง - ไม่ต้องนับเวลา (ใช้ countdown แทน)
    if (game.isHalftime) {
        return;
    }
    
    // ถ้าเป็น overtime จะไม่นับเวลา
    if (game.isOvertime) {
        return;
    }
    
    // ลดเวลาลง
    game.timer -= deltaTime;
    
    // อัพเดท UI
    updateTimerDisplay();
    
    // ถ้าเวลาหมด
    if (game.timer <= 0) {
        game.timer = 0;
        
        // ถ้าครึ่งแรกจบ -> พักครึ่ง
        if (game.currentHalf === 1) {
            startHalftime();
        }
        // ถ้าครึ่งหลังจบ -> ตรวจสอบว่าต้อง overtime หรือไม่
        else if (game.currentHalf === 2) {
            if (game.scoreLeft === game.scoreRight) {
                // เสมอกัน -> เริ่ม overtime
                startOvertime();
            } else {
                // มีผู้ชนะ
                endGame(game.scoreLeft > game.scoreRight ? 'player1' : 'player2');
            }
        }
    }
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(game.timer / 60);
    const seconds = Math.floor(game.timer % 60);
    const timerElement = document.getElementById('timer');
    
    if (game.isHalftime) {
        timerElement.textContent = 'พักครึ่ง';
    } else if (game.isOvertime) {
        timerElement.textContent = 'ET';
    } else {
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Show countdown (3, 2, 1)
function showCountdown(number) {
    const countdownElement = document.getElementById('countdown-message');
    if (number > 0) {
        countdownElement.textContent = number;
        countdownElement.className = 'countdown-message show';
        setTimeout(() => {
            countdownElement.classList.remove('show');
            setTimeout(() => {
                showCountdown(number - 1);
            }, 100);
        }, 900);
    } else {
        // จบ countdown - เริ่มเล่นต่อ
        countdownElement.textContent = '';
        countdownElement.className = 'countdown-message';
        game.isHalftime = false;
        game.isPaused = false;
        game.currentHalf = 2;
        game.timer = 90;
        resetBall();
        resetPlayers();
        updateGameStatus();
        updateTimerDisplay();
    }
}

// Update timeline
function updateTimeline() {
    // Reset all
    document.getElementById('timeline-half1').classList.remove('active', 'completed');
    document.getElementById('timeline-ht').classList.remove('active', 'completed');
    document.getElementById('timeline-half2').classList.remove('active', 'completed');
    document.getElementById('timeline-ot').classList.remove('active', 'completed');
    
    if (game.isOvertime) {
        document.getElementById('timeline-half1').classList.add('completed');
        document.getElementById('timeline-ht').classList.add('completed');
        document.getElementById('timeline-half2').classList.add('completed');
        document.getElementById('timeline-ot').classList.add('active');
    } else if (game.currentHalf === 2) {
        if (game.isHalftime) {
            document.getElementById('timeline-half1').classList.add('completed');
            document.getElementById('timeline-ht').classList.add('active');
        } else {
            document.getElementById('timeline-half1').classList.add('completed');
            document.getElementById('timeline-ht').classList.add('completed');
            document.getElementById('timeline-half2').classList.add('active');
        }
    } else {
        document.getElementById('timeline-half1').classList.add('active');
    }
}

// Update game status display
function updateGameStatus() {
    const halfIndicator = document.getElementById('half-indicator');
    const gameStatus = document.getElementById('game-status');
    
    if (game.isHalftime) {
        halfIndicator.textContent = 'HT';
        gameStatus.textContent = 'เวลาพักครึ่ง';
        gameStatus.style.display = 'block';
    } else if (game.isOvertime) {
        halfIndicator.textContent = 'ET';
        gameStatus.textContent = 'Extra Time (ทำประตูก่อนชนะ)';
        gameStatus.style.display = 'block';
    } else {
        halfIndicator.textContent = `${game.currentHalf}/2`;
        gameStatus.textContent = '';
        gameStatus.style.display = 'none';
    }
    
    updateTimeline();
}

// Start halftime
function startHalftime() {
    game.isPaused = true;
    game.isHalftime = true;
    game.halftimeTimer = game.halftimeDuration;
    updateGameStatus();
    updateTimerDisplay();
    resetBall();
    resetPlayers();
    
    // แสดงนับถอยหลัง 3, 2, 1
    showCountdown(3);
}

// Start overtime
function startOvertime() {
    game.isOvertime = true;
    game.timer = 0;
    resetBall();
    resetPlayers();
    updateGameStatus();
    updateTimerDisplay();
}

// End game
function endGame(winner) {
    game.isPlaying = false;
    game.isPaused = true;
    const timerElement = document.getElementById('timer');
    const winnerOverlay = document.getElementById('winner-overlay');
    const winnerTitle = document.getElementById('winner-title');
    const winnerScoreLeft = document.getElementById('winner-score-left');
    const winnerScoreRight = document.getElementById('winner-score-right');
    
    // อัพเดทคะแนนใน UI
    winnerScoreLeft.textContent = game.scoreLeft;
    winnerScoreRight.textContent = game.scoreRight;
    
    // แสดงข้อความผู้ชนะ
    if (winner === 'player1') {
        winnerTitle.textContent = 'ผู้เล่น 1 ชนะ!';
        winnerTitle.style.color = '#3498db';
        winnerScoreLeft.parentElement.classList.add('winner');
    } else {
        winnerTitle.textContent = 'ผู้เล่น 2 ชนะ!';
        winnerTitle.style.color = '#e74c3c';
        winnerScoreRight.parentElement.classList.add('winner');
    }
    
    // แสดง overlay
    winnerOverlay.classList.add('show');
    
    timerElement.textContent = 'จบ';
}

// Main game loop
function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw field
    drawField();
    
    // Update timer
    updateTimer();
    
    // Update game objects
    if (game.isPlaying && !game.isPaused && !game.isHalftime) {
        updatePlayer(player1);
        updatePlayer(player2);
        updateBall();
    }
    
    // Draw game objects
    drawPlayer(player1);
    drawPlayer(player2);
    drawBall();
    
    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Initialize game
function init() {
    resetBall();
    resetPlayers();
    game.lastTime = Date.now();
    updateGameStatus();
    updateTimerDisplay();
    
    // ซ่อน winner overlay ถ้ามีการเริ่มเกมใหม่
    const winnerOverlay = document.getElementById('winner-overlay');
    winnerOverlay.classList.remove('show');
    const winnerScoreLeft = document.getElementById('winner-score-left').parentElement;
    const winnerScoreRight = document.getElementById('winner-score-right').parentElement;
    winnerScoreLeft.classList.remove('winner');
    winnerScoreRight.classList.remove('winner');
    
    gameLoop();
}

// Start game
init();
