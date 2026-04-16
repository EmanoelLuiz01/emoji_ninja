(function(){
    // Elementos das telas
    const mainMenuScreen = document.getElementById('mainMenuScreen');
    const difficultyScreen = document.getElementById('difficultyScreen');
    const gameContainer = document.getElementById('gameContainer');
    
    const playMainBtn = document.getElementById('playMainBtn');
    const backToMainBtn = document.getElementById('backToMainBtn');
    const menuBtn = document.getElementById('menuBtn');
    const restartGameBtn = document.getElementById('restartGameBtn');
    
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Configuração responsiva do canvas
    let canvasWidth = 1000;
    let canvasHeight = 600;
    
    function resizeCanvas() {
        const container = canvas.parentElement;
        const maxWidth = Math.min(1200, window.innerWidth - 40);
        const aspectRatio = canvasHeight / canvasWidth;
        canvas.style.width = `${maxWidth}px`;
        canvas.style.height = `${maxWidth * aspectRatio}px`;
    }
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const scoreSpan = document.getElementById('scoreValue');
    const livesSpan = document.getElementById('livesValue');
    const bestSpan = document.getElementById('bestValue');
    const levelNameSpan = document.getElementById('levelName');
    const msgDiv = document.getElementById('effectMessage');

    let gameRunning = false;
    let animationId = null;
    let score = 0;
    let lives = 3;
    let bestScore = localStorage.getItem('emojiNinjaBest') || 0;
    bestSpan.innerText = bestScore;
    
    let currentDifficulty = 'medium';
    
    // CONFIGURAÇÕES CORRIGIDAS - Agora os emojis caem de cima para baixo
    const levelConfig = {
        easy: {
            spawnInterval: 800,        // Tempo entre spawns (ms)
            maxEmojis: 12,             // Máximo de emojis na tela
            gravity: 0.35,             // Gravidade aumentada para queda mais natural
            minVy: -2,                 // Velocidade vertical mínima (ligeiramente para cima)
            maxVy: 2,                  // Velocidade vertical máxima (para baixo)
            speedVxRange: 1.5,         // Velocidade horizontal aleatória
            badProb: 0.10,             // Chance de emoji ruim
            bombProb: 0.04,            // Chance de bomba
            name: '🍃 FÁCIL',
            spawnY: -30                // Posição Y de spawn (fora da tela)
        },
        medium: {
            spawnInterval: 580,
            maxEmojis: 16,
            gravity: 0.48,
            minVy: -3,
            maxVy: 3,
            speedVxRange: 2.2,
            badProb: 0.16,
            bombProb: 0.09,
            name: '⚡ MÉDIO',
            spawnY: -30
        },
        hard: {
            spawnInterval: 400,
            maxEmojis: 22,
            gravity: 0.65,
            minVy: -4,
            maxVy: 4,
            speedVxRange: 3.2,
            badProb: 0.25,
            bombProb: 0.14,
            name: '🔥 DIFÍCIL',
            spawnY: -30
        }
    };
    
    let currentConfig = levelConfig.medium;
    
    let emojis = [];
    let swipePoints = [];
    const SWIPE_TIMEOUT = 120;
    
    let floatingTexts = [];
    let sliceSparks = [];
    let redFlashAlpha = 0;
    
    const goodEmojis = ['😀', '😂', '🥰', '😎', '🐱', '⭐', '🍕', '🍉', '🍒', '🌸', '🎈', '⚽', '🌟', '🍦', '🐶', '🦄', '🍭', '😍', '🎉', '✨'];
    const badEmojis = ['💩', '💀', '👹', '🤢', '☠️', '🕷️', '🧨', '👻', '😈'];
    const bombEmoji = '💣';
    
    function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    
    function showMessage(msg, color="#FFD700") {
        msgDiv.innerText = msg;
        msgDiv.style.opacity = "1";
        msgDiv.style.color = color;
        setTimeout(() => { msgDiv.style.opacity = "0"; }, 1300);
    }
    
    // FUNÇÃO CORRIGIDA - Emojis agora spawnam no topo da tela
    function createEmoji() {
        const cfg = currentConfig;
        let rng = Math.random();
        let type = 'good';
        let emojiChar = '';
        
        if (rng < cfg.badProb) {
            type = 'bad';
            emojiChar = randomItem(badEmojis);
        } else if (rng < cfg.badProb + cfg.bombProb) {
            type = 'bomb';
            emojiChar = bombEmoji;
        } else {
            type = 'good';
            emojiChar = randomItem(goodEmojis);
        }
        
        // CORREÇÃO: Emojis spawnam no topo da tela (Y negativo ou no topo)
        const x = 50 + Math.random() * (canvas.width - 100);
        const y = cfg.spawnY - Math.random() * 20; // Fora da tela no topo
        
        // Velocidade vertical: pode ser positiva (caindo) ou negativa (subindo levemente)
        const vy = cfg.minVy + Math.random() * (cfg.maxVy - cfg.minVy);
        
        // Velocidade horizontal aleatória
        const vx = (Math.random() - 0.5) * cfg.speedVxRange;
        
        const radius = 34;
        
        return { 
            x, y, vx, vy, 
            gravity: cfg.gravity, 
            type, char: emojiChar, 
            radius, active: true, 
            hit: false, hitTimer: 0 
        };
    }
    
    let lastSpawnTime = 0;
    
    function trySpawnEmoji(now) {
        if (!gameRunning) return;
        if (emojis.length < currentConfig.maxEmojis) {
            emojis.push(createEmoji());
        }
    }
    
    // FUNÇÃO CORRIGIDA - Física de queda mais realista
    function updateEmojis() {
        for (let i = 0; i < emojis.length; i++) {
            const e = emojis[i];
            
            if (e.hit) {
                e.hitTimer--;
                if (e.hitTimer <= 0) { 
                    emojis.splice(i,1); 
                    i--; 
                }
                continue;
            }
            
            // Aplica velocidade
            e.x += e.vx;
            e.y += e.vy;
            
            // Aplica gravidade (aceleração para baixo)
            e.vy += e.gravity;
            
            // Remove emojis que saíram da tela (pela parte de baixo ou laterais)
            if (e.y - e.radius > canvas.height + 100 || 
                e.y + e.radius < -100 ||
                e.x + e.radius < -100 || 
                e.x - e.radius > canvas.width + 100) {
                emojis.splice(i,1);
                i--;
            }
        }
    }
    
    function processSwipeCut() {
        if (!gameRunning || swipePoints.length === 0) return;
        
        for (let i = 0; i < emojis.length; i++) {
            const e = emojis[i];
            if (e.hit) continue;
            
            let wasHit = false;
            for (let p of swipePoints) {
                if (Math.hypot(p.x - e.x, p.y - e.y) < e.radius) {
                    wasHit = true;
                    break;
                }
            }
            
            if (wasHit) {
                e.hit = true;
                e.hitTimer = 6;
                createSliceEffect(e.x, e.y);
                
                if (e.type === 'good') {
                    score += 10;
                    updateScoreUI();
                    showFloatingText(e.x, e.y, '+10', '#aaffaa');
                    createSparkle(e.x, e.y);
                }
                else if (e.type === 'bad') {
                    lives = Math.max(0, lives - 1);
                    updateLivesUI();
                    showFloatingText(e.x, e.y, '-1 ❤️', '#ff8888');
                    redFlash();
                    const livesBox = document.querySelector('.lives-box');
                    if(livesBox) {
                        livesBox.style.transform = 'scale(1.1)';
                        setTimeout(() => { if(livesBox) livesBox.style.transform = ''; }, 150);
                    }
                    if (lives <= 0) gameOver();
                }
                else if (e.type === 'bomb') {
                    lives = Math.max(0, lives - 2);
                    updateLivesUI();
                    showFloatingText(e.x, e.y, '-2 💣', '#ff6666');
                    redFlash();
                    const livesBox = document.querySelector('.lives-box');
                    if(livesBox) {
                        livesBox.style.transform = 'scale(1.2)';
                        livesBox.style.backgroundColor = 'rgba(200, 50, 50, 0.9)';
                        setTimeout(() => { 
                            if(livesBox) {
                                livesBox.style.transform = '';
                                livesBox.style.backgroundColor = '';
                            }
                        }, 200);
                    }
                    if (lives <= 0) gameOver();
                }
            }
        }
    }
    
    function createSparkle(x, y) {
        const maxSparks = 30;
        const sparkCount = Math.min(8, maxSparks - sliceSparks.length);
        for(let i = 0; i < sparkCount; i++) {
            sliceSparks.push({
                x: x, y: y, 
                vx: (Math.random()-0.5)*6, 
                vy: (Math.random()-0.5)*6 - 2,
                life: 12,
                color: `hsl(${Math.random()*60 + 40}, 100%, 60%)`
            });
        }
    }
    
    let isPointerDown = false;
    
    function addSwipePoint(clientX, clientY) {
        if (!gameRunning) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let canvasX = (clientX - rect.left) * scaleX;
        let canvasY = (clientY - rect.top) * scaleY;
        canvasX = Math.min(Math.max(0, canvasX), canvas.width);
        canvasY = Math.min(Math.max(0, canvasY), canvas.height);
        
        swipePoints.push({ x: canvasX, y: canvasY, timestamp: Date.now() });
        swipePoints = swipePoints.filter(p => Date.now() - p.timestamp < SWIPE_TIMEOUT);
        processSwipeCut();
    }
    
    function clearSwipe() { swipePoints = []; }
    
    function updateScoreUI() { 
        scoreSpan.innerText = score;
        if(score > bestScore) {
            bestScore = score;
            bestSpan.innerText = bestScore;
            localStorage.setItem('emojiNinjaBest', bestScore);
            const bestBox = document.querySelector('.best-box');
            if(bestBox) {
                bestBox.style.transform = 'scale(1.1)';
                bestBox.style.backgroundColor = 'rgba(255, 215, 0, 0.9)';
                setTimeout(() => { 
                    if(bestBox) {
                        bestBox.style.transform = '';
                        bestBox.style.backgroundColor = '';
                    }
                }, 300);
            }
        }
    }
    
    function updateLivesUI() { 
        livesSpan.innerText = lives;
        const livesBox = document.querySelector('.lives-box');
        if(livesBox) {
            if(lives === 1) livesBox.style.borderColor = '#ff6666';
            else if(lives === 2) livesBox.style.borderColor = '#ffaa66';
            else livesBox.style.borderColor = '#00aaff';
        }
    }
    
    function gameOver() {
        if (!gameRunning) return;
        gameRunning = false;
        showMessage(`💀 GAME OVER! Pontuação: ${score} 💀`, "#ffaa66");
        
        restartGameBtn.classList.add('pulse-animation');
        setTimeout(() => {
            restartGameBtn.classList.remove('pulse-animation');
        }, 1500);
        
        lastSpawnTime = 0;
    }
    
    // FUNÇÃO CORRIGIDA - Spawn inicial com emojis no topo
    function startGame(difficulty) {
        currentDifficulty = difficulty;
        currentConfig = levelConfig[difficulty];
        score = 0;
        lives = 3;
        emojis = [];
        swipePoints = [];
        floatingTexts = [];
        sliceSparks = [];
        redFlashAlpha = 0;
        
        levelNameSpan.innerText = currentConfig.name;
        updateScoreUI();
        updateLivesUI();
        
        // Spawn inicial de emojis (todos no topo)
        for(let i = 0; i < 5; i++) {
            emojis.push(createEmoji());
        }
        
        gameRunning = true;
        lastSpawnTime = performance.now();
        if(animationId) cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(gameLoop);
        
        showMessage(`⚔️ ${currentConfig.name} - VAMOS COMEÇAR! ⚔️`, "#88ffaa");
    }
    
    function stopGameAndShowMainMenu() {
        if(animationId) { cancelAnimationFrame(animationId); animationId = null; }
        gameRunning = false;
        gameContainer.style.display = 'none';
        mainMenuScreen.classList.remove('hide');
        difficultyScreen.classList.add('hide');
    }
    
    function showDifficultyAndHideGame() {
        if(animationId) { cancelAnimationFrame(animationId); animationId = null; }
        gameRunning = false;
        gameContainer.style.display = 'none';
        mainMenuScreen.classList.add('hide');
        difficultyScreen.classList.remove('hide');
    }
    
    function showFloatingText(x, y, text, color) { 
        floatingTexts.push({ x, y, text, color, life: 28 }); 
    }
    
    function updateFloating() {
        for(let i=0; i<floatingTexts.length; i++) {
            floatingTexts[i].life--;
            floatingTexts[i].y -= 1.2;
            if(floatingTexts[i].life <= 0) {
                floatingTexts.splice(i,1);
                i--;
            }
        }
    }
    
    function drawFloating() {
        for(let t of floatingTexts) {
            ctx.font = `bold ${26 - t.life/8}px "Segoe UI Emoji"`;
            ctx.fillStyle = t.color;
            ctx.shadowBlur = 4;
            ctx.shadowColor = "black";
            ctx.fillText(t.text, t.x-20, t.y-20);
        }
    }
    
    function createSliceEffect(x,y) {
        const sparkCount = Math.min(8, 25 - sliceSparks.length);
        for(let i=0;i<sparkCount;i++) {
            sliceSparks.push({
                x, y, 
                vx: (Math.random()-0.5)*7, 
                vy: (Math.random()-0.5)*5 - 2,
                life: 10,
                color: `hsl(${Math.random()*60 + 30}, 100%, 65%)`
            });
        }
    }
    
    function updateSparks() {
        for(let i=0;i<sliceSparks.length;i++) {
            sliceSparks[i].x += sliceSparks[i].vx;
            sliceSparks[i].y += sliceSparks[i].vy;
            sliceSparks[i].life--;
            if(sliceSparks[i].life <= 0) {
                sliceSparks.splice(i,1);
                i--;
            }
        }
    }
    
    function drawSparks() {
        for(let s of sliceSparks) {
            ctx.fillStyle = s.color || `rgba(255, 200, 70, ${s.life/10})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 3.5, 0, Math.PI*2);
            ctx.fill();
        }
    }
    
    function redFlash() { redFlashAlpha = 0.45; }
    function updateFlash() { if(redFlashAlpha>0) { redFlashAlpha -= 0.04; if(redFlashAlpha<0) redFlashAlpha=0; } }
    function drawRedFlash() { if(redFlashAlpha>0) { ctx.fillStyle = `rgba(200,30,30,${redFlashAlpha})`; ctx.fillRect(0,0,canvas.width,canvas.height); } }
    
    function drawSwipeTrail() {
        if(swipePoints.length < 2) return;
        ctx.save();
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#00aaff";
        for(let i=0; i<swipePoints.length-1; i++) {
            const p1 = swipePoints[i];
            const p2 = swipePoints[i+1];
            const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            grad.addColorStop(0, '#ffdd88');
            grad.addColorStop(1, '#ff8844');
            ctx.strokeStyle = grad;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
        ctx.restore();
    }
    
    function draw() {
        // Fundo gradiente
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#0a1a3a');
        grad.addColorStop(1, '#062040');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Efeito de brilho no fundo
        ctx.fillStyle = "rgba(0, 100, 200, 0.08)";
        for(let i=0;i<4;i++) {
            ctx.beginPath();
            ctx.arc(150 + i*250, 450, 120, 0, Math.PI*2);
            ctx.fill();
        }
        
        // Desenha os emojis
        for(let e of emojis) {
            let size = e.hit ? 46 : 56;
            ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji"`;
            ctx.shadowBlur = 8;
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            
            // Sombra
            ctx.fillStyle = "#000000aa";
            ctx.fillText(e.char, e.x-28, e.y+18);
            
            // Contorno claro
            ctx.fillStyle = "#ffffff";
            ctx.fillText(e.char, e.x-30, e.y+16);
            
            // Cor principal
            ctx.fillStyle = "#2a2a2a";
            ctx.fillText(e.char, e.x-31, e.y+15);
        }
        
        drawSwipeTrail();
        drawSparks();
        drawFloating();
        drawRedFlash();
        
        ctx.shadowBlur = 0;
        
        // Tela de Game Over
        if(!gameRunning && emojis.length > 0 && lives === 0) {
            ctx.fillStyle = "rgba(0,0,0,0.85)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = "bold 42px 'Segoe UI', monospace";
            ctx.fillStyle = "#FFD966";
            ctx.shadowBlur = 0;
            ctx.fillText("💀 GAME OVER 💀", canvas.width/2-150, canvas.height/2-30);
            ctx.font = "20px monospace";
            ctx.fillStyle = "#88aaff";
            ctx.fillText("Clique em RECOMEÇAR para tentar novamente!", canvas.width/2-210, canvas.height/2+40);
        }
    }
    
    function gameLoop(now) {
        if(!gameRunning) { 
            draw(); 
            animationId = requestAnimationFrame(gameLoop);
            return; 
        }
        
        // Controle de spawn de novos emojis
        if(lastSpawnTime && now - lastSpawnTime > currentConfig.spawnInterval) {
            trySpawnEmoji(now);
            lastSpawnTime = now;
        } else if(!lastSpawnTime) {
            lastSpawnTime = now;
        }
        
        updateEmojis();
        updateSparks();
        updateFloating();
        updateFlash();
        
        swipePoints = swipePoints.filter(p => Date.now() - p.timestamp < SWIPE_TIMEOUT);
        
        draw();
        
        animationId = requestAnimationFrame(gameLoop);
    }
    
    // Eventos de input com prevenção de arrasto da página
    function bindEvents() {
        const onPointerMove = (e) => {
            if(!gameRunning) return;
            e.preventDefault();
            const point = e.touches ? e.touches[0] : e;
            if(isPointerDown || e.buttons === 1 || e.touches) {
                addSwipePoint(point.clientX, point.clientY);
            }
        };
        
        const onPointerStart = (e) => {
            if(!gameRunning) return;
            e.preventDefault();
            isPointerDown = true;
            const point = e.touches ? e.touches[0] : e;
            addSwipePoint(point.clientX, point.clientY);
        };
        
        const onPointerEnd = (e) => {
            if(!gameRunning) return;
            e.preventDefault();
            isPointerDown = false;
            clearSwipe();
        };
        
        canvas.addEventListener('mousedown', onPointerStart);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerEnd);
        
        canvas.addEventListener('touchstart', onPointerStart, {passive: false});
        canvas.addEventListener('touchmove', onPointerMove, {passive: false});
        canvas.addEventListener('touchend', onPointerEnd);
        canvas.addEventListener('touchcancel', onPointerEnd);
        canvas.addEventListener('dragstart', (e) => e.preventDefault());
    }
    
    // Navegação entre telas
    playMainBtn.addEventListener('click', () => {
        mainMenuScreen.classList.add('hide');
        difficultyScreen.classList.remove('hide');
    });
    
    backToMainBtn.addEventListener('click', () => {
        difficultyScreen.classList.add('hide');
        mainMenuScreen.classList.remove('hide');
    });
    
    menuBtn.addEventListener('click', () => {
        stopGameAndShowMainMenu();
    });
    
    restartGameBtn.addEventListener('click', () => {
        if(currentDifficulty) {
            restartGameBtn.classList.remove('pulse-animation');
            startGame(currentDifficulty);
        }
    });
    
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const difficulty = btn.getAttribute('data-difficulty');
            currentDifficulty = difficulty;
            gameContainer.style.display = 'block';
            difficultyScreen.classList.add('hide');
            startGame(difficulty);
        });
    });
    
    function createStars() {
        const starsContainer = document.getElementById('stars');
        for(let i = 0; i < 150; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.width = Math.random() * 3 + 1 + 'px';
            star.style.height = star.style.width;
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDelay = Math.random() * 5 + 's';
            star.style.animationDuration = Math.random() * 3 + 2 + 's';
            starsContainer.appendChild(star);
        }
    }
    
    createStars();
    bindEvents();
    
    mainMenuScreen.classList.remove('hide');
    difficultyScreen.classList.add('hide');
    gameContainer.style.display = 'none';
})();