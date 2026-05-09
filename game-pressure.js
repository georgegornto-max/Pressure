const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const levels = [
  {
    name: "Level 1: Silt Intake",
    objective: "Recover the breach key and reach the maintenance hatch.",
    radio: "Control says the outer facility is still pressurized. Get the breach key and keep moving.",
    pressureBase: 10,
    oxygenDrain: 4.2,
    light: 170,
    cores: [{ x: 826, y: 448 }],
    exit: { x: 890, y: 72, w: 42, h: 72 },
    walls: [
      { x: 170, y: 60, w: 24, h: 350 },
      { x: 330, y: 180, w: 280, h: 24 },
      { x: 510, y: 290, w: 24, h: 180 },
      { x: 635, y: 92, w: 180, h: 24 },
      { x: 716, y: 270, w: 160, h: 24 }
    ],
    creatures: [
      { x: 430, y: 430, radius: 16, speed: 58, health: 38 },
      { x: 750, y: 360, radius: 18, speed: 64, health: 42 }
    ],
    divers: [
      { x: 740, y: 132, radius: 15, speed: 58, health: 52, cooldown: 1.3 }
    ]
  },
  {
    name: "Level 2: Choir Labs",
    objective: "Secure both prototype canisters. Ignore the whispers.",
    radio: "Signal quality is degrading. We are hearing extra voices on your channel. They are not ours.",
    pressureBase: 34,
    oxygenDrain: 5.4,
    light: 130,
    cores: [
      { x: 194, y: 416 },
      { x: 818, y: 112 }
    ],
    exit: { x: 900, y: 446, w: 34, h: 60 },
    walls: [
      { x: 150, y: 120, w: 26, h: 310 },
      { x: 296, y: 80, w: 24, h: 200 },
      { x: 296, y: 360, w: 24, h: 120 },
      { x: 410, y: 180, w: 260, h: 24 },
      { x: 620, y: 280, w: 24, h: 200 },
      { x: 730, y: 120, w: 24, h: 210 }
    ],
    creatures: [
      { x: 520, y: 108, radius: 16, speed: 64, health: 44 },
      { x: 560, y: 434, radius: 18, speed: 68, health: 48 }
    ],
    divers: [
      { x: 420, y: 302, radius: 15, speed: 60, health: 58, cooldown: 1.15 },
      { x: 818, y: 360, radius: 15, speed: 62, health: 58, cooldown: 1.1 }
    ]
  },
  {
    name: "Level 3: Black Vault",
    objective: "Steal the abyssal drive and reach the ascent cage before the suit floods.",
    radio: "The vault is beneath the safe envelope. If the visor cracks, you are racing the ocean home.",
    pressureBase: 62,
    oxygenDrain: 6.8,
    light: 96,
    cores: [{ x: 842, y: 452 }],
    exit: { x: 64, y: 62, w: 50, h: 78 },
    walls: [
      { x: 150, y: 96, w: 26, h: 370 },
      { x: 270, y: 96, w: 480, h: 24 },
      { x: 270, y: 300, w: 26, h: 180 },
      { x: 380, y: 196, w: 24, h: 270 },
      { x: 510, y: 96, w: 24, h: 220 },
      { x: 640, y: 220, w: 220, h: 24 },
      { x: 760, y: 340, w: 24, h: 140 }
    ],
    creatures: [
      { x: 324, y: 434, radius: 18, speed: 76, health: 52 },
      { x: 618, y: 430, radius: 20, speed: 80, health: 56 },
      { x: 834, y: 164, radius: 18, speed: 78, health: 54 }
    ],
    divers: [
      { x: 618, y: 150, radius: 16, speed: 68, health: 62, cooldown: 1.0 },
      { x: 816, y: 320, radius: 16, speed: 70, health: 62, cooldown: 0.95 }
    ]
  }
];

const state = {
  running: false,
  levelIndex: 0,
  won: false,
  levelComplete: false,
  levelReady: false,
  time: 0,
  last: 0,
  shots: [],
  enemyShots: [],
  particles: [],
  phantoms: [],
  keys: {},
  mouse: { x: 480, y: 270 },
  player: null,
  currentLevel: null,
  radioSeed: 0,
  flashTimer: 0,
  messageAction: "start"
};

const statGrid = document.getElementById("statGrid");
const levelLabel = document.getElementById("levelLabel");
const objectiveText = document.getElementById("objectiveText");
const radioText = document.getElementById("radioText");
const levelList = document.getElementById("levelList");
const floodOverlay = document.getElementById("floodOverlay");
const flashOverlay = document.getElementById("flashOverlay");
const messageOverlay = document.getElementById("messageOverlay");
const messageEyebrow = document.getElementById("messageEyebrow");
const messageTitle = document.getElementById("messageTitle");
const messageBody = document.getElementById("messageBody");
const messageButton = document.getElementById("messageButton");

function cloneEnemy(enemy) {
  return { ...enemy, fireTimer: enemy.cooldown || 1.2, alive: true };
}

function createPlayer() {
  return {
    x: 88,
    y: 468,
    radius: 14,
    angle: 0,
    health: 100,
    oxygen: 100,
    ammo: 24,
    pressure: 10,
    sanity: 100,
    loot: 0,
    cracked: false,
    flood: 0,
    dash: 100,
    depthBias: 0
  };
}

function startRun() {
  state.running = false;
  state.won = false;
  state.levelIndex = 0;
  state.player = createPlayer();
  state.time = 0;
  state.last = 0;
  startLevel(0, false);
}

function startLevel(index, pauseAtStart = true) {
  const data = levels[index];
  state.levelIndex = index;
  state.currentLevel = {
    ...data,
    cores: data.cores.map((core) => ({ ...core, collected: false, pulse: Math.random() * Math.PI * 2 })),
    creatures: data.creatures.map(cloneEnemy),
    divers: data.divers.map(cloneEnemy)
  };
  state.shots = [];
  state.enemyShots = [];
  state.particles = [];
  state.phantoms = [];
  state.levelComplete = false;
  state.levelReady = false;
  state.player.x = index === 0 ? 88 : 72;
  state.player.y = 468;
  state.player.pressure = Math.max(state.player.pressure, data.pressureBase);
  state.player.depthBias = data.pressureBase;
  objectiveText.textContent = data.objective;
  radioText.textContent = data.radio;
  levelLabel.textContent = data.name;
  renderLevelList();
  if (pauseAtStart) {
    showMessage("Dive Phase", data.name, data.objective, index === 0 ? "Start Level" : "Continue");
    state.messageAction = "resume";
    state.running = false;
  } else {
    hideMessage();
    state.running = true;
  }
}

function renderLevelList() {
  levelList.innerHTML = "";
  levels.forEach((level, index) => {
    const node = document.createElement("div");
    const complete = index < state.levelIndex;
    const active = index === state.levelIndex;
    node.className = `level-chip${complete ? " complete" : ""}${active ? " active" : ""}`;
    node.innerHTML = `
      <strong>${level.name}</strong>
      <span>${level.objective}</span>
    `;
    levelList.appendChild(node);
  });
}

function showMessage(eyebrow, title, body, buttonLabel) {
  messageEyebrow.textContent = eyebrow;
  messageTitle.textContent = title;
  messageBody.textContent = body;
  messageButton.textContent = buttonLabel;
  messageOverlay.classList.remove("hidden");
}

function hideMessage() {
  messageOverlay.classList.add("hidden");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function rectContains(rect, x, y) {
  return x > rect.x && x < rect.x + rect.w && y > rect.y && y < rect.y + rect.h;
}

function circleRectCollision(circle, rect) {
  const testX = clamp(circle.x, rect.x, rect.x + rect.w);
  const testY = clamp(circle.y, rect.y, rect.y + rect.h);
  return dist(circle.x, circle.y, testX, testY) < circle.radius;
}

function moveWithWalls(entity, dx, dy) {
  entity.x += dx;
  for (const wall of state.currentLevel.walls) {
    if (circleRectCollision(entity, wall)) {
      entity.x -= dx;
      break;
    }
  }
  entity.y += dy;
  for (const wall of state.currentLevel.walls) {
    if (circleRectCollision(entity, wall)) {
      entity.y -= dy;
      break;
    }
  }
  entity.x = clamp(entity.x, entity.radius + 8, canvas.width - entity.radius - 8);
  entity.y = clamp(entity.y, entity.radius + 8, canvas.height - entity.radius - 8);
}

function firePlayerShot() {
  if (!state.running || messageOverlay.classList.contains("hidden") === false) return;
  if (state.player.ammo <= 0) return;
  state.player.ammo -= 1;
  state.shots.push({
    x: state.player.x,
    y: state.player.y,
    vx: Math.cos(state.player.angle) * 420,
    vy: Math.sin(state.player.angle) * 420,
    radius: 4,
    life: 1.2
  });
}

function fireEnemyShot(enemy, speed = 220) {
  const angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
  state.enemyShots.push({
    x: enemy.x,
    y: enemy.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 5,
    life: 3
  });
}

function spawnHit(x, y, color) {
  for (let i = 0; i < 7; i += 1) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 90,
      vy: (Math.random() - 0.5) * 90,
      life: 0.55,
      color
    });
  }
}

function damagePlayer(amount) {
  state.player.health = clamp(state.player.health - amount, 0, 100);
  state.flashTimer = 0.2;
  flashOverlay.classList.remove("active");
  void flashOverlay.offsetWidth;
  flashOverlay.classList.add("active");
  if (state.player.health <= 48) state.player.cracked = true;
  if (state.player.health <= 0) {
    failRun("Suit Failure", "The suit imploded under combined pressure and damage before extraction.");
  }
}

function failRun(title, body) {
  state.running = false;
  showMessage("Dive Lost", title, body, "Restart Run");
  state.messageAction = "restart";
}

function completeLevel() {
  state.levelComplete = true;
  state.running = false;

  if (state.levelIndex === levels.length - 1) {
    state.won = true;
    showMessage(
      "Extraction Complete",
      "Prototype Secured",
      `You escaped with ${state.player.loot} tech core${state.player.loot === 1 ? "" : "s"} and just enough sanity to remember what chased you.`,
      "Dive Again"
    );
    state.messageAction = "restart";
    return;
  }

  const nextLevel = levels[state.levelIndex + 1];
  showMessage("Pressure Rising", `${state.currentLevel.name} Cleared`, `Hatch breached. Next stop: ${nextLevel.name}. ${nextLevel.objective}`, "Descend");
  state.messageAction = "next-level";
}

function update(dt) {
  if (!state.running) return;

  state.time += dt;
  const level = state.currentLevel;
  const player = state.player;
  const depthFactor = clamp(player.y / canvas.height, 0, 1);
  const pressureRate = level.pressureBase + depthFactor * 24 + state.levelIndex * 5;

  player.pressure = clamp(player.pressure + (pressureRate - player.pressure) * dt * 0.45, 0, 100);
  player.oxygen = clamp(player.oxygen - level.oxygenDrain * dt - player.flood * 0.015 * dt, 0, 100);
  player.sanity = clamp(player.sanity - Math.max(0, player.pressure - 34) * 0.04 * dt, 0, 100);
  player.dash = clamp(player.dash + 18 * dt, 0, 100);

  if (player.cracked) {
    player.flood = clamp(player.flood + (10 + player.pressure * 0.08) * dt, 0, 100);
  } else {
    player.flood = clamp(player.flood - 10 * dt, 0, 100);
  }

  if (player.oxygen <= 0) failRun("Oxygen Exhausted", "Your reserve ran dry before you reached the next hatch.");
  if (player.sanity <= 0) failRun("Psychological Break", "The pressure whispers became louder than command.");
  if (player.flood >= 100) failRun("Visor Flooded", "Water overtook the helmet seal and took your sight with it.");

  const slow = 1 - clamp((player.pressure - 30) / 120, 0, 0.45);
  const burst = state.keys.Shift && player.dash > 10 ? 1.45 : 1;
  if (burst > 1) player.dash = clamp(player.dash - 35 * dt, 0, 100);
  const speed = 168 * slow * burst;
  let dx = 0;
  let dy = 0;
  if (state.keys.w || state.keys.ArrowUp) dy -= 1;
  if (state.keys.s || state.keys.ArrowDown) dy += 1;
  if (state.keys.a || state.keys.ArrowLeft) dx -= 1;
  if (state.keys.d || state.keys.ArrowRight) dx += 1;
  const mag = Math.hypot(dx, dy) || 1;
  moveWithWalls(player, (dx / mag) * speed * dt, (dy / mag) * speed * dt);
  player.angle = Math.atan2(state.mouse.y - player.y, state.mouse.x - player.x);

  for (const core of level.cores) {
    if (!core.collected && dist(player.x, player.y, core.x, core.y) < 22) {
      core.collected = true;
      player.loot += 1;
      player.ammo = clamp(player.ammo + 5, 0, 99);
      player.sanity = clamp(player.sanity + 5, 0, 100);
      spawnHit(core.x, core.y, "#f8cb6b");
    }
  }

  const allCores = level.cores.every((core) => core.collected);
  objectiveText.textContent = allCores
    ? "Objective secure. Reach the hatch."
    : `${level.objective} (${level.cores.filter((core) => core.collected).length}/${level.cores.length} secured)`;

  if (allCores && rectContains(level.exit, player.x, player.y)) {
    completeLevel();
  }

  updateShots(dt, level);
  updateEnemies(dt, player, level);
  updateParticles(dt);
  updatePhantoms(dt, player);
  updateRadio();
  updateHud();
}

function updateShots(dt, level) {
  state.shots = state.shots.filter((shot) => {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (shot.life <= 0) return false;
    if (shot.x < 0 || shot.y < 0 || shot.x > canvas.width || shot.y > canvas.height) return false;
    if (level.walls.some((wall) => rectContains(wall, shot.x, shot.y))) return false;

    for (const group of [level.creatures, level.divers]) {
      for (const enemy of group) {
        if (!enemy.alive) continue;
        if (dist(shot.x, shot.y, enemy.x, enemy.y) < enemy.radius + shot.radius) {
          enemy.health -= 26;
          spawnHit(enemy.x, enemy.y, "#80e7ff");
          if (enemy.health <= 0) {
            enemy.alive = false;
            spawnHit(enemy.x, enemy.y, "#ff7171");
          }
          return false;
        }
      }
    }

    return true;
  });

  state.enemyShots = state.enemyShots.filter((shot) => {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (shot.life <= 0) return false;
    if (shot.x < 0 || shot.y < 0 || shot.x > canvas.width || shot.y > canvas.height) return false;
    if (level.walls.some((wall) => rectContains(wall, shot.x, shot.y))) return false;
    if (dist(shot.x, shot.y, state.player.x, state.player.y) < state.player.radius + shot.radius) {
      damagePlayer(14);
      spawnHit(shot.x, shot.y, "#ff7171");
      return false;
    }
    return true;
  });
}

function updateEnemies(dt, player, level) {
  for (const creature of level.creatures) {
    if (!creature.alive) continue;
    const angle = Math.atan2(player.y - creature.y, player.x - creature.x);
    const near = dist(player.x, player.y, creature.x, creature.y) < 240;
    const pace = near ? creature.speed : creature.speed * 0.35;
    const wander = near ? 0 : Math.sin(state.time + creature.x) * 0.8;
    moveWithWalls(creature, Math.cos(angle + wander) * pace * dt, Math.sin(angle + wander) * pace * dt);
    if (dist(player.x, player.y, creature.x, creature.y) < player.radius + creature.radius) {
      damagePlayer(18 * dt);
    }
  }

  for (const diver of level.divers) {
    if (!diver.alive) continue;
    const angle = Math.atan2(player.y - diver.y, player.x - diver.x);
    const range = dist(player.x, player.y, diver.x, diver.y);
    if (range > 180) {
      moveWithWalls(diver, Math.cos(angle) * diver.speed * dt, Math.sin(angle) * diver.speed * dt);
    } else if (range < 120) {
      moveWithWalls(diver, -Math.cos(angle) * diver.speed * 0.55 * dt, -Math.sin(angle) * diver.speed * 0.55 * dt);
    }
    diver.fireTimer -= dt;
    if (diver.fireTimer <= 0 && range < 300) {
      diver.fireTimer = diver.cooldown + Math.random() * 0.35;
      fireEnemyShot(diver, 240 + state.levelIndex * 25);
    }
  }
}

function updateParticles(dt) {
  state.particles = state.particles.filter((particle) => {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
    return particle.life > 0;
  });
}

function updatePhantoms(dt, player) {
  const targetCount = player.pressure > 58 ? 3 : player.pressure > 42 ? 1 : 0;
  while (state.phantoms.length < targetCount) {
    state.phantoms.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      life: 1.5 + Math.random() * 1.4
    });
  }
  state.phantoms.forEach((phantom) => {
    phantom.life -= dt;
    phantom.x += Math.sin(state.time + phantom.y) * 18 * dt;
    phantom.y += Math.cos(state.time + phantom.x) * 18 * dt;
  });
  state.phantoms = state.phantoms.filter((phantom) => phantom.life > 0);
}

function distort(text) {
  if (state.player.pressure < 45) return text;
  const chars = text.split("");
  const chaos = Math.floor((100 - state.player.sanity) / 14);
  for (let i = 0; i < chaos; i += 1) {
    const index = Math.floor(Math.random() * chars.length);
    chars[index] = ["~", "/", "#", ".", ":"].at(Math.floor(Math.random() * 5));
  }
  return chars.join("");
}

function updateRadio() {
  const base = state.currentLevel.radio;
  const suffix = state.player.pressure > 68
    ? " Something is speaking under the carrier."
    : state.player.pressure > 46
      ? " Stay off the dark glass."
      : " Channel clean enough.";
  radioText.textContent = distort(base + suffix);
}

function updateHud() {
  const player = state.player || {
    health: 100,
    oxygen: 100,
    pressure: 10,
    sanity: 100,
    ammo: 24,
    dash: 100,
    flood: 0,
    cracked: false
  };
  const stats = [
    ["Integrity", player.health, player.health < 38 ? "danger" : player.health < 62 ? "warning" : ""],
    ["Oxygen", player.oxygen, player.oxygen < 30 ? "danger" : player.oxygen < 55 ? "warning" : ""],
    ["Pressure", player.pressure, player.pressure > 75 ? "danger" : player.pressure > 50 ? "warning" : ""],
    ["Sanity", player.sanity, player.sanity < 35 ? "danger" : player.sanity < 60 ? "warning" : ""],
    ["Ammo", player.ammo, player.ammo < 7 ? "warning" : ""],
    ["Dash", player.dash, ""]
  ];

  statGrid.innerHTML = stats.map(([label, value, tone]) => `
    <div class="stat">
      <span>${label}</span>
      <strong class="${tone}">${Math.round(value)}</strong>
      <div class="bar"><i style="width:${clamp(value, 0, 100)}%"></i></div>
    </div>
  `).join("");

  floodOverlay.classList.toggle("active", player.flood > 5);
  floodOverlay.style.opacity = String(clamp(player.flood / 100, 0.08, 0.7));
  document.body.classList.toggle("pressure-high", player.pressure > 70);
  document.body.classList.toggle("visor-cracked", player.cracked);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!state.currentLevel) return;

  const level = state.currentLevel;
  const player = state.player;
  const pressureDark = clamp((player.pressure - 20) / 90, 0, 0.8);

  ctx.fillStyle = `rgba(2, 10, 18, ${0.22 + pressureDark * 0.55})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();
  drawExit(level.exit, level.cores.every((core) => core.collected));
  level.walls.forEach(drawWall);
  level.cores.forEach(drawCore);
  state.phantoms.forEach(drawPhantom);
  level.creatures.filter((enemy) => enemy.alive).forEach((enemy) => drawEnemy(enemy, "#73e7ff"));
  level.divers.filter((enemy) => enemy.alive).forEach((enemy) => drawEnemy(enemy, "#ff9278"));
  state.shots.forEach((shot) => drawShot(shot, "#d9feff"));
  state.enemyShots.forEach((shot) => drawShot(shot, "#ff9278"));
  state.particles.forEach(drawParticle);
  drawPlayer(player);
  drawLight(player);
  drawUiHints(level);
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = "rgba(88, 145, 165, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWall(wall) {
  ctx.fillStyle = "#0a2434";
  ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  ctx.strokeStyle = "rgba(128, 231, 255, 0.12)";
  ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
}

function drawExit(exit, open) {
  ctx.fillStyle = open ? "rgba(112, 231, 155, 0.26)" : "rgba(248, 203, 107, 0.18)";
  ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
  ctx.strokeStyle = open ? "#70e79b" : "#f8cb6b";
  ctx.lineWidth = 2;
  ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);
}

function drawCore(core) {
  if (core.collected) return;
  core.pulse += 0.08;
  const pulse = 8 + Math.sin(core.pulse) * 2;
  ctx.fillStyle = "#f8cb6b";
  ctx.beginPath();
  ctx.arc(core.x, core.y, pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff6cc";
  ctx.beginPath();
  ctx.arc(core.x, core.y, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemy(enemy, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.arc(enemy.x + enemy.radius * 0.2, enemy.y - enemy.radius * 0.2, enemy.radius * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShot(shot, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticle(particle) {
  ctx.globalAlpha = clamp(particle.life * 2, 0, 1);
  ctx.fillStyle = particle.color;
  ctx.fillRect(particle.x, particle.y, 3, 3);
  ctx.globalAlpha = 1;
}

function drawPhantom(phantom) {
  ctx.globalAlpha = Math.min(0.22, phantom.life * 0.1);
  ctx.fillStyle = "#c9ecff";
  ctx.beginPath();
  ctx.arc(phantom.x, phantom.y, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawPlayer(player) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  ctx.fillStyle = "#7af2ff";
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d9feff";
  ctx.fillRect(0, -3, 16, 6);
  ctx.restore();
}

function drawLight(player) {
  const radius = state.currentLevel.light - clamp(player.pressure * 0.8, 0, 45) + Math.sin(state.time * 10) * (player.pressure > 55 ? 8 : 2);
  ctx.save();
  const gradient = ctx.createRadialGradient(player.x, player.y, 20, player.x, player.y, radius);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(0.45, "rgba(0, 0, 0, 0.24)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.92)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawUiHints(level) {
  const allCores = level.cores.every((core) => core.collected);
  ctx.fillStyle = "rgba(231, 247, 255, 0.82)";
  ctx.font = "14px Trebuchet MS";
  ctx.fillText(allCores ? "Hatch unlocked" : "Recover all tech cores", 24, 28);
  if (state.player.pressure > 55) {
    ctx.fillStyle = "rgba(248, 203, 107, 0.9)";
    ctx.fillText("Pressure spike: movement reduced, lights unstable", 24, 48);
  }
  if (state.player.cracked) {
    ctx.fillStyle = "rgba(255, 113, 113, 0.95)";
    ctx.fillText("Visor cracked: flooding in progress", 24, 68);
  }
}

function loop(timestamp) {
  if (!state.last) state.last = timestamp;
  const dt = Math.min((timestamp - state.last) / 1000, 0.033);
  state.last = timestamp;
  if (state.flashTimer > 0) state.flashTimer -= dt;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

document.addEventListener("keydown", (event) => {
  state.keys[event.key] = true;
});

document.addEventListener("keyup", (event) => {
  state.keys[event.key] = false;
});

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  state.mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  state.mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
});

canvas.addEventListener("mousedown", firePlayerShot);

messageButton.addEventListener("click", () => {
  if (state.messageAction === "start") {
    startRun();
    return;
  }
  if (state.messageAction === "resume") {
    hideMessage();
    state.running = true;
    return;
  }
  if (state.messageAction === "next-level") {
    startLevel(state.levelIndex + 1, false);
    return;
  }
  if (state.messageAction === "restart") {
    startRun();
  }
});

renderLevelList();
updateHud();
requestAnimationFrame(loop);
