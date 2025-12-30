// --- KHỞI TẠO CƠ BẢN ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const COLORS = {
    darkPurple: '#320064',
    lightPurple: '#c864ff',
    neonBlue: '#00ffff',
    red: '#ff0000',
    green: '#00ff00',
    yellow: '#ffff00'
};

// TẢI HÌNH ẢNH KẺ ĐỊCH
const enemyImg = new Image();
// Sử dụng chính xác tên file bạn đã cung cấp
enemyImg.src = 'z7381934587124_81bddaa1dca9f96c1f602c1e15572d8c.png'; 

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- INPUT ---
const keys = {};
const mouse = { x: 0, y: 0, down: false };
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mousedown', () => mouse.down = true);
window.addEventListener('mouseup', () => mouse.down = false);

// --- CLASSES ---
class Particle {
    constructor(x, y, color, size, speed) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(this.angle) * speed;
        this.vy = Math.sin(this.angle) * speed;
        this.lifetime = 1.0;
        this.decay = Math.random() * 0.02 + 0.01;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.lifetime -= this.decay;
        this.size *= 0.96;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.lifetime);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, angle, speed = 12, damage = 50) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.damage = damage;
        this.radius = 4;
        this.markedForDeletion = false;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.markedForDeletion = true;
        }
    }
    draw() {
        ctx.shadowBlur = 10;
        ctx.shadowColor = COLORS.neonBlue;
        ctx.fillStyle = COLORS.neonBlue;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = 20 + type * 5;
        this.maxHealth = 100 * type;
        this.health = this.maxHealth;
        this.speed = 1.5 + Math.random() * 1.5;
        this.color = COLORS.red;
        this.markedForDeletion = false;
        this.effects = { dot: 0, slow: 0 };
    }

    update(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);
        let currentSpeed = this.speed * (this.effects.slow > 0 ? 0.4 : 1);
        
        if (dist > 0) {
            this.x += (dx / dist) * currentSpeed;
            this.y += (dy / dist) * currentSpeed;
        }

        if (this.effects.dot > 0) {
            this.health -= 1.5;
            this.effects.dot--;
            if (Math.random() < 0.2) createExplosion(this.x, this.y, COLORS.lightPurple, 1);
        }
        
        if (this.effects.slow > 0) this.effects.slow--;
        if (this.health <= 0) this.markedForDeletion = true;
    }

    draw() {
        ctx.save();
        
        // Vẽ hiệu ứng đổ bóng đỏ cho kẻ địch
        ctx.shadowBlur = 15;
        ctx.shadowColor = "red";

        // Vẽ hình ảnh từ file bạn đã cung cấp
        const size = this.radius * 2.5; // Tăng size một chút để ảnh phủ đẹp hơn
        ctx.drawImage(
            enemyImg, 
            this.x - size / 2, 
            this.y - size / 2, 
            size, 
            size
        );

        // Vẽ thanh máu (HP bar)
        const hpRatio = this.health / this.maxHealth;
        ctx.shadowBlur = 0; 
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - this.radius, this.y - this.radius - 15, this.radius * 2, 6);
        ctx.fillStyle = COLORS.green;
        ctx.fillRect(this.x - this.radius, this.y - this.radius - 15, (this.radius * 2) * hpRatio, 6);

        ctx.restore();
    }
}

class Player {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.radius = 16;
        this.maxHealth = 1000;
        this.health = this.maxHealth;
        this.maxSoul = 100;
        this.soul = 100;
        this.level = 1;
        this.xp = 0;
        this.xpToLevel = 150;
        this.essence = 0;
        this.cd = { slash: 0, orb: 0, dash: 0, ult: 0 };
        this.isDashing = false;
        this.ultActive = false;
        this.ultTime = 0;
    }

    update() {
        if (this.soul < this.maxSoul) this.soul += 0.12;
        for (let k in this.cd) if (this.cd[k] > 0) this.cd[k]--;

        let dx = 0, dy = 0;
        if (keys['w']) dy = -1; if (keys['s']) dy = 1;
        if (keys['a']) dx = -1; if (keys['d']) dx = 1;

        if (dx !== 0 || dy !== 0) {
            const mag = Math.hypot(dx, dy);
            dx /= mag; dy /= mag;
        }

        let speed = this.isDashing ? 18 : 4.5;
        if (this.isDashing) {
            this.dashTime--;
            createExplosion(this.x, this.y, 'rgba(0,255,255,0.1)', 1);
            if (this.dashTime <= 0) this.isDashing = false;
        }

        this.x += dx * speed;
        this.y += dy * speed;
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

        if (keys['1'] && this.cd.slash <= 0 && this.soul >= 20) this.useSlash();
        if (keys['2'] && this.cd.orb <= 0 && this.soul >= 35) this.useOrbs();
        if (keys[' '] && this.cd.dash <= 0) this.useDash();
        if (keys['='] && this.cd.ult <= 0) this.useUlt();

        if (this.ultActive) {
            this.ultTime--;
            if (this.ultTime <= 0) this.ultActive = false;
            enemies.forEach(e => {
                if (Math.hypot(e.x - this.x, e.y - this.y) < 320) {
                    e.health -= 3;
                    e.effects.slow = 20;
                }
            });
        }
    }

    useSlash() {
        this.soul -= 20; this.cd.slash = 50;
        const angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
        createExplosion(this.x, this.y, COLORS.lightPurple, 15);
        enemies.forEach(e => {
            let dist = Math.hypot(e.x - this.x, e.y - this.y);
            let angleToE = Math.atan2(e.y - this.y, e.x - this.x);
            let diff = Math.abs(angle - angleToE);
            if (dist < 180 && (diff < 0.6 || diff > Math.PI*2 - 0.6)) {
                e.health -= 250;
                createExplosion(e.x, e.y, COLORS.lightPurple, 8);
            }
        });
    }

    useOrbs() {
        this.soul -= 35; this.cd.orb = 110;
        for (let i = 0; i < 12; i++) {
            bullets.push(new Bullet(this.x, this.y, (i * Math.PI * 2) / 12, 10, 60));
        }
    }

    useDash() {
        this.isDashing = true; this.dashTime = 12; this.cd.dash = 70;
    }

    useUlt() {
        this.ultActive = true; this.ultTime = 500; this.cd.ult = 3000;
        createExplosion(this.x, this.y, COLORS.darkPurple, 60);
    }

    draw() {
        if (this.ultActive) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 320, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(100, 0, 255, 0.1)';
            ctx.fill();
            ctx.strokeStyle = COLORS.lightPurple;
            ctx.stroke();
        }
        ctx.shadowBlur = 20; ctx.shadowColor = COLORS.neonBlue;
        ctx.fillStyle = COLORS.neonBlue;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// --- GAME ENGINE ---
let player, bullets, enemies, particles, gameRunning = false, score = 0, frameCount = 0;

function init() {
    player = new Player();
    bullets = []; enemies = []; particles = [];
    score = 0; frameCount = 0;
}

function createExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color, Math.random() * 5 + 2, Math.random() * 4));
}

function spawnLogic() {
    if (frameCount % Math.max(15, 60 - player.level * 3) === 0) {
        let x, y, edge = Math.floor(Math.random() * 4);
        if (edge === 0) { x = Math.random() * canvas.width; y = -50; }
        else if (edge === 1) { x = Math.random() * canvas.width; y = canvas.height + 50; }
        else if (edge === 2) { x = -50; y = Math.random() * canvas.height; }
        else { x = canvas.width + 50; y = Math.random() * canvas.height; }
        
        let type = 1;
        if (score > 1000 && Math.random() < 0.1) type = 2;
        if (score > 3000 && Math.random() < 0.02) type = 3;
        enemies.push(new Enemy(x, y, type));
    }
}

function updateUI() {
    document.getElementById('hp-bar').style.width = (player.health / player.maxHealth * 100) + "%";
    document.getElementById('hp-text').innerText = `${Math.max(0, Math.floor(player.health))}/${player.maxHealth}`;
    document.getElementById('soul-bar').style.width = (player.soul / player.maxSoul * 100) + "%";
    document.getElementById('soul-text').innerText = Math.floor(player.soul);
    document.getElementById('xp-bar').style.width = (player.xp / player.xpToLevel * 100) + "%";
    document.getElementById('score-display').innerText = "Score: " + score;
    document.getElementById('level-display').innerText = player.level;
    document.getElementById('essence-display').innerText = player.essence;

    document.getElementById('cd-overlay-1').style.height = (player.cd.slash / 50 * 100) + "%";
    document.getElementById('skill1-box').classList.toggle('ready', player.cd.slash <= 0 && player.soul >= 20);
    document.getElementById('cd-overlay-2').style.height = (player.cd.orb / 110 * 100) + "%";
    document.getElementById('skill2-box').classList.toggle('ready', player.cd.orb <= 0 && player.soul >= 35);
    document.getElementById('cd-overlay-3').style.height = (player.cd.dash / 70 * 100) + "%";
    document.getElementById('skill3-box').classList.toggle('ready', player.cd.dash <= 0);
    document.getElementById('cd-overlay-ult').style.height = (player.cd.ult / 3000 * 100) + "%";
    document.getElementById('ult-box').classList.toggle('ready', player.cd.ult <= 0);
}

function gameLoop() {
    if (!gameRunning) return;
    ctx.fillStyle = 'rgba(5, 5, 10, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (mouse.down && frameCount % 8 === 0) {
        bullets.push(new Bullet(player.x, player.y, Math.atan2(mouse.y - player.y, mouse.x - player.x)));
    }

    player.update();
    player.draw();

    bullets.forEach((b, i) => {
        b.update(); b.draw();
        if (b.markedForDeletion) bullets.splice(i, 1);
    });

    spawnLogic();

    enemies.forEach((e, i) => {
        e.update(player);
        e.draw();
        
        bullets.forEach(b => {
            if (Math.hypot(b.x - e.x, b.y - e.y) < e.radius + b.radius) {
                e.health -= b.damage;
                e.effects.dot = 20;
                b.markedForDeletion = true;
            }
        });

        if (Math.hypot(e.x - player.x, e.y - player.y) < e.radius + player.radius && !player.isDashing) {
            player.health -= 0.5;
        }

        if (e.markedForDeletion) {
            score += e.type * 50;
            player.xp += e.type * 30;
            player.essence += e.type;
            createExplosion(e.x, e.y, COLORS.red, 15);
            enemies.splice(i, 1);
        }
    });

    if (player.xp >= player.xpToLevel) {
        player.level++; player.xp = 0; player.xpToLevel *= 1.4;
        player.maxHealth += 150; player.health = player.maxHealth;
        createExplosion(player.x, player.y, COLORS.yellow, 40);
    }

    particles.forEach((p, i) => {
        p.update(); p.draw();
        if (p.lifetime <= 0) particles.splice(i, 1);
    });

    if (player.health <= 0) endGame();

    updateUI();
    frameCount++;
    requestAnimationFrame(gameLoop);
}

function startGame() {
    document.getElementById('menu-overlay').style.display = 'none';
    gameRunning = true;
    init();
    gameLoop();
}

function endGame() {
    gameRunning = false;
    document.getElementById('menu-overlay').style.display = 'flex';
    document.querySelector('h1').innerText = "THẤT BẠI";
    document.getElementById('start-btn').innerText = "TRÙNG SINH";
}
