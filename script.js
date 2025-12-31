/* ================== SETUP ================== */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
resize();
window.addEventListener("resize", resize);

function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}

/* ================== INPUT ================== */
const keys = {};
window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === "Tab") {
    e.preventDefault();
    toggleInventory();
  }
});
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

/* ================== AUDIO ================== */
const sounds = {
  shoot: new Audio("assets/shoot.wav"),
  dash: new Audio("assets/dash.wav"),
  pickup: new Audio("assets/pickup.wav")
};

/* ================== PLAYER ================== */
const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  r: 18,
  speed: 4,
  hp: 100,
  maxHp: 100,
  inventory: [],
  dashCd: 0
};

/* ================== ENTITIES ================== */
const bullets = [];
const enemies = [];
const particles = [];

/* ================== INVENTORY ================== */
const inventoryUI = document.getElementById("inventory");
const itemsUI = document.getElementById("items");

function toggleInventory() {
  inventoryUI.classList.toggle("hidden");
  renderInventory();
}

function renderInventory() {
  itemsUI.innerHTML = "";
  player.inventory.forEach((item, i) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `${i+1}. ${item.name}`;
    itemsUI.appendChild(div);
  });
}

window.addEventListener("keydown", e => {
  const i = parseInt(e.key) - 1;
  if (player.inventory[i]) {
    useItem(i);
  }
});

function useItem(i) {
  const item = player.inventory[i];
  if (item.type === "heal") {
    player.hp = Math.min(player.maxHp, player.hp + item.value);
    player.inventory.splice(i, 1);
    renderInventory();
  }
}

/* ================== SPAWN ================== */
setInterval(() => {
  enemies.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: 16,
    hp: 30
  });
}, 1200);

setInterval(() => {
  player.inventory.push({ name: "Máu nhỏ", type: "heal", value: 30 });
  sounds.pickup.play();
}, 6000);

/* ================== UPDATE ================== */
function update() {
  // Move
  if (keys["w"]) player.y -= player.speed;
  if (keys["s"]) player.y += player.speed;
  if (keys["a"]) player.x -= player.speed;
  if (keys["d"]) player.x += player.speed;

  // Dash
  if (keys[" "] && player.dashCd <= 0) {
    player.x += (keys["d"] ? 1 : keys["a"] ? -1 : 0) * 120;
    player.y += (keys["s"] ? 1 : keys["w"] ? -1 : 0) * 120;
    player.dashCd = 60;
    sounds.dash.play();
    shake = 8;
  }
  player.dashCd--;

  // Shoot auto
  if (Math.random() < 0.1) {
    bullets.push({
      x: player.x,
      y: player.y,
      dx: Math.cos(Date.now()) * 8,
      dy: Math.sin(Date.now()) * 8
    });
    sounds.shoot.play();
  }

  bullets.forEach(b => {
    b.x += b.dx;
    b.y += b.dy;
  });
}

/* ================== DRAW ================== */
let shake = 0;

function draw() {
  ctx.save();
  if (shake > 0) {
    ctx.translate(Math.random()*shake, Math.random()*shake);
    shake--;
  }

  ctx.fillStyle = "black";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Player
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#0ff";
  ctx.fillStyle = "#0ff";
  circle(player.x, player.y, player.r);

  // Bullets
  ctx.fillStyle = "#f0f";
  bullets.forEach(b => circle(b.x, b.y, 4));

  // Enemies
  ctx.fillStyle = "#f33";
  enemies.forEach(e => circle(e.x, e.y, e.r));

  // HP bar
  ctx.shadowBlur = 0;
  ctx.fillStyle = "red";
  ctx.fillRect(20,20,200,10);
  ctx.fillStyle = "#0f0";
  ctx.fillRect(20,20,200*(player.hp/player.maxHp),10);

  ctx.restore();
}

function circle(x,y,r){
  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fill();
}

/* ================== LOOP ================== */
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
