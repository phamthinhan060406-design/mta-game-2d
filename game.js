const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const overlayEl = document.getElementById("overlay");
const statusTextEl = document.getElementById("statusText");
const startBtn = document.getElementById("startBtn");

let bestScore = Number(localStorage.getItem("dodge2d_best") || 0);
bestScoreEl.textContent = bestScore;

let isRunning = false;
let score = 0;
let spawnTimer = 0;
let shootCooldown = 0;
let rapidFireTimer = 0;
let screenShake = 0;
let enemies = [];
let bullets = [];
let particles = [];
let powerups = [];
let keys = { left: false, right: false, shoot: false };

const stars = Array.from({ length: 45 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  r: 0.9 + Math.random() * 2,
  alpha: 0.25 + Math.random() * 0.75
}));

const player = {
  width: 60,
  height: 60,
  x: canvas.width / 2 - 30,
  y: canvas.height - 80,
  speed: 360
};

function resetGame() {
  score = 0;
  spawnTimer = 0;
  shootCooldown = 0;
  rapidFireTimer = 0;
  screenShake = 0;
  enemies = [];
  bullets = [];
  particles = [];
  powerups = [];
  player.x = canvas.width / 2 - player.width / 2;
  scoreEl.textContent = "0";
}

function startGame() {
  resetGame();
  isRunning = true;
  overlayEl.classList.add("hidden");
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function gameOver() {
  isRunning = false;
  screenShake = 12;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("dodge2d_best", bestScore);
    bestScoreEl.textContent = bestScore;
  }
  statusTextEl.textContent = `Game Over! Điểm của bạn: ${score}`;
  startBtn.textContent = "Chơi lại";
  overlayEl.classList.remove("hidden");
}

function spawnParticles(x, y, color, count = 14) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 200;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.25 + Math.random() * 0.22,
      maxLife: 0.47,
      size: 3 + Math.random() * 3.5,
      color
    });
  }
}

function spawnPowerup(x, y) {
  const type = Math.random() < 0.5 ? "rapid" : "bonus";
  powerups.push({
    x,
    y,
    width: 26,
    height: 26,
    speed: 150,
    type
  });
}

function spawnBullet() {
  if (rapidFireTimer > 0) {
    bullets.push(
      { x: player.x + 11, y: player.y - 12, width: 6, height: 15, speed: 580 },
      { x: player.x + player.width - 17, y: player.y - 12, width: 6, height: 15, speed: 580 }
    );
  } else {
    bullets.push({
      x: player.x + player.width / 2 - 3.5,
      y: player.y - 14,
      width: 7,
      height: 16,
      speed: 540
    });
  }
}

function createAsteroidVertices(radius, sides = 10) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    const jitter = 0.78 + Math.random() * 0.3;
    pts.push({
      x: Math.cos(angle) * radius * jitter,
      y: Math.sin(angle) * radius * jitter
    });
  }
  return pts;
}

function spawnEnemy() {
  const isHeavy = Math.random() < 0.3;
  const size = isHeavy ? 62 : 38 + Math.random() * 14;
  const x = Math.random() * (canvas.width - size);
  const speed = (isHeavy ? 135 : 185) + Math.min(230, score * 3.5) + Math.random() * 65;
  enemies.push({
    x,
    y: -size,
    width: size,
    height: size,
    speed,
    hp: isHeavy ? 2 : 1,
    isHeavy,
    vertices: createAsteroidVertices(size / 2, isHeavy ? 12 : 9),
    craters: [
      { ox: -0.28, oy: -0.2, r: 0.2 },
      { ox: 0.25, oy: 0.18, r: 0.16 },
      { ox: -0.05, oy: 0.3, r: 0.12 }
    ]
  });
}

function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function update(dt) {
  if (screenShake > 0) {
    screenShake = Math.max(0, screenShake - dt * 35);
  }
  if (rapidFireTimer > 0) {
    rapidFireTimer = Math.max(0, rapidFireTimer - dt);
  }

  if (keys.left) player.x -= player.speed * dt;
  if (keys.right) player.x += player.speed * dt;
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

  shootCooldown = Math.max(0, shootCooldown - dt);
  if (keys.shoot && shootCooldown <= 0) {
    spawnBullet();
    shootCooldown = rapidFireTimer > 0 ? 0.13 : 0.22;
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y -= bullets[i].speed * dt;
    if (bullets[i].y + bullets[i].height < 0) {
      bullets.splice(i, 1);
    }
  }

  spawnTimer += dt;
  const spawnInterval = Math.max(0.35, 0.88 - score * 0.008);
  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    spawnEnemy();
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.y += enemy.speed * dt;

    let destroyedByBullet = false;
    for (let j = bullets.length - 1; j >= 0; j--) {
      if (isColliding(bullets[j], enemy)) {
        bullets.splice(j, 1);
        enemy.hp -= 1;
        spawnParticles(
          enemy.x + enemy.width / 2,
          enemy.y + enemy.height / 2,
          enemy.hp > 0 ? "#fb923c" : "#ef4444",
          enemy.hp > 0 ? 7 : 16
        );

        if (enemy.hp <= 0) {
          const cx = enemy.x + enemy.width / 2;
          const cy = enemy.y + enemy.height / 2;
          enemies.splice(i, 1);
          score += enemy.isHeavy ? 3 : 2;
          scoreEl.textContent = score;
          if (enemy.isHeavy) screenShake = 5;
          if (Math.random() < 0.2) spawnPowerup(cx - 13, cy - 13);
          destroyedByBullet = true;
        }
        break;
      }
    }
    if (destroyedByBullet) continue;

    if (isColliding(player, enemy)) {
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2, "#22c55e", 22);
      gameOver();
      return;
    }

    if (enemy.y > canvas.height) {
      enemies.splice(i, 1);
      score += 1;
      scoreEl.textContent = score;
    }
  }

  for (let i = powerups.length - 1; i >= 0; i--) {
    const item = powerups[i];
    item.y += item.speed * dt;
    if (isColliding(player, item)) {
      if (item.type === "rapid") {
        rapidFireTimer = 5;
      } else {
        score += 5;
        scoreEl.textContent = score;
      }
      spawnParticles(item.x + item.width / 2, item.y + item.height / 2, "#38bdf8", 12);
      powerups.splice(i, 1);
      continue;
    }
    if (item.y > canvas.height) {
      powerups.splice(i, 1);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawPlayer(p) {
  const flameColor = rapidFireTimer > 0 ? "#38bdf8" : "#fb923c";
  const flameLen = 12 + Math.random() * 8;

  ctx.save();
  // Lửa phản lực đôi hai bên động cơ
  ctx.fillStyle = flameColor;
  ctx.beginPath();
  ctx.moveTo(p.x + p.width * 0.3, p.y + p.height * 0.86);
  ctx.lineTo(p.x + p.width * 0.37, p.y + p.height + flameLen);
  ctx.lineTo(p.x + p.width * 0.44, p.y + p.height * 0.86);
  ctx.moveTo(p.x + p.width * 0.56, p.y + p.height * 0.86);
  ctx.lineTo(p.x + p.width * 0.63, p.y + p.height + flameLen);
  ctx.lineTo(p.x + p.width * 0.7, p.y + p.height * 0.86);
  ctx.closePath();
  ctx.fill();

  // Cánh phụ hai bên
  ctx.fillStyle = "#15803d";
  ctx.beginPath();
  ctx.moveTo(p.x + p.width * 0.25, p.y + p.height * 0.52);
  ctx.lineTo(p.x, p.y + p.height * 0.88);
  ctx.lineTo(p.x + p.width * 0.28, p.y + p.height * 0.82);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(p.x + p.width * 0.75, p.y + p.height * 0.52);
  ctx.lineTo(p.x + p.width, p.y + p.height * 0.88);
  ctx.lineTo(p.x + p.width * 0.72, p.y + p.height * 0.82);
  ctx.closePath();
  ctx.fill();

  // Thân phi thuyền chính
  ctx.fillStyle = "#22c55e";
  ctx.strokeStyle = "#86efac";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x + p.width / 2, p.y);
  ctx.lineTo(p.x + p.width * 0.78, p.y + p.height * 0.86);
  ctx.lineTo(p.x + p.width / 2, p.y + p.height * 0.72);
  ctx.lineTo(p.x + p.width * 0.22, p.y + p.height * 0.86);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Vạch sọc đỏ trang trí cánh
  ctx.fillStyle = "#f97316";
  ctx.fillRect(p.x + 6, p.y + p.height * 0.74, 8, 4);
  ctx.fillRect(p.x + p.width - 14, p.y + p.height * 0.74, 8, 4);

  // Kính buồng lái
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.ellipse(
    p.x + p.width / 2,
    p.y + p.height * 0.44,
    p.width * 0.12,
    p.height * 0.19,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Ánh sáng phản chiếu trên kính
  ctx.fillStyle = "#e0f2fe";
  ctx.beginPath();
  ctx.arc(p.x + p.width * 0.47, p.y + p.height * 0.38, p.width * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(e) {
  const cx = e.x + e.width / 2;
  const cy = e.y + e.height / 2;
  const radius = e.width / 2;

  ctx.save();
  ctx.translate(cx, cy);

  // Thân thiên thạch đa giác gồ ghề
  ctx.fillStyle = e.isHeavy ? "#991b1b" : "#dc2626";
  ctx.strokeStyle = e.isHeavy ? "#fdba74" : "#fca5a5";
  ctx.lineWidth = e.isHeavy ? 3 : 2;
  ctx.beginPath();
  e.vertices.forEach((pt, idx) => {
    if (idx === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Các hố thiên thạch có viền sáng nhẹ
  for (const c of e.craters) {
    const cr = radius * c.r;
    const x = radius * c.ox;
    const y = radius * c.oy;
    ctx.fillStyle = e.isHeavy ? "#450a0a" : "#7f1d1d";
    ctx.beginPath();
    ctx.arc(x, y, cr, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(254, 202, 202, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + 1, y + 1, cr * 0.85, 0, Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}

function drawBullet(b) {
  ctx.save();
  ctx.fillStyle = rapidFireTimer > 0 ? "#38bdf8" : "#fde047";
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.width, b.height, 4);
  ctx.fill();

  // Đầu đạn sáng hơn
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(b.x + 1.5, b.y + 1, Math.max(2, b.width - 3), 4);
  ctx.restore();
}

function drawPowerup(item) {
  const cx = item.x + item.width / 2;
  const cy = item.y + item.height / 2;
  const r = item.width / 2;

  ctx.save();
  ctx.fillStyle = item.type === "rapid" ? "#38bdf8" : "#c084fc";
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(item.type === "rapid" ? "R" : "+5", cx, cy + 0.5);
  ctx.restore();
}

function draw() {
  ctx.save();
  if (screenShake > 0) {
    const dx = (Math.random() - 0.5) * screenShake;
    const dy = (Math.random() - 0.5) * screenShake;
    ctx.translate(dx, dy);
  }

  ctx.clearRect(-20, -20, canvas.width + 40, canvas.height + 40);

  for (const s of stars) {
    ctx.fillStyle = `rgba(248, 250, 252, ${s.alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const item of powerups) {
    drawPowerup(item);
  }

  for (const bullet of bullets) {
    drawBullet(bullet);
  }

  drawPlayer(player);

  for (const enemy of enemies) {
    drawEnemy(enemy);
  }

  for (const pt of particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;

  if (rapidFireTimer > 0) {
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Bắn nhanh: ${rapidFireTimer.toFixed(1)}s`, 12, 24);
  }

  ctx.restore();
}

let lastTime = performance.now();
function loop(now) {
  if (!isRunning) return;
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") keys.left = true;
  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") keys.right = true;
  if (e.code === "Space") {
    e.preventDefault();
    keys.shoot = true;
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") keys.left = false;
  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") keys.right = false;
  if (e.code === "Space") keys.shoot = false;
});

startBtn.addEventListener("click", startGame);
draw();