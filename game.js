kaplay({
  width: 800,
  height: 600,
  letterbox: true,
  background: [0, 0, 20],
});

loadSprite("ship",         "assets/sprites/ship.png");
loadSprite("alien_grunt",  "assets/sprites/alien_grunt.png");
loadSprite("alien_buzzer", "assets/sprites/alien_buzzer.png");
loadSprite("alien_tank",   "assets/sprites/alien_tank.png");
loadSprite("bullet",       "assets/sprites/bullet.png");
loadSound("shoot",    "assets/audio/shoot.wav");
loadSound("hit",      "assets/audio/hit.wav");
loadSound("correct",  "assets/audio/correct.wav");
loadSound("wrong",    "assets/audio/wrong.wav");
loadSound("gameover", "assets/audio/gameover.wav");

async function loadPacks() {
  const res = await fetch("assets/packs/index.json");
  const filenames = await res.json();
  const packs = await Promise.all(
    filenames.map(async (filename) => {
      const r = await fetch(`assets/packs/${filename}`);
      return r.json();
    })
  );
  return packs;
}

function defaultUpgrades() {
  return {
    lives: 1,
    shieldHits: 0,
    weapon: "blaster",   // "blaster" | "spread" | "laser"
    smartBombs: 0,
    scoreMultiplier: 1,
  };
}

const HS_KEY = "alienquiz_scores";
const HS_MAX = 10;

function loadScores() {
  try { return JSON.parse(localStorage.getItem(HS_KEY)) || []; }
  catch { return []; }
}

function saveScore(name, score) {
  const scores = loadScores();
  scores.push({ name: name.toUpperCase().slice(0, 3), score });
  scores.sort((a, b) => b.score - a.score);
  localStorage.setItem(HS_KEY, JSON.stringify(scores.slice(0, HS_MAX)));
}

scene("title", (packs) => {
  add([
    text("ALIEN QUIZ SHOOTER", { size: 40, font: "monospace" }),
    pos(width() / 2, 80),
    anchor("center"),
    color(255, 230, 0),
  ]);

  add([
    text("Choose a topic pack:", { size: 20 }),
    pos(width() / 2, 160),
    anchor("center"),
    color(200, 200, 255),
  ]);

  packs.forEach((pack, i) => {
    const btnY = 230 + i * 80;
    const btn = add([
      rect(400, 60, { radius: 8 }),
      pos(width() / 2, btnY),
      anchor("center"),
      color(30, 30, 80),
      area(),
      "packBtn",
    ]);

    add([
      text(pack.name, { size: 22 }),
      pos(width() / 2, btnY - 8),
      anchor("center"),
      color(255, 255, 255),
    ]);

    add([
      text(pack.description, { size: 13 }),
      pos(width() / 2, btnY + 16),
      anchor("center"),
      color(160, 160, 200),
    ]);

    btn.onClick(() => {
      go("quiz", { pack, questionIndex: 0, upgrades: defaultUpgrades(), level: 1 });
    });
  });

  add([
    text("High Scores", { size: 18 }),
    pos(width() / 2, height() - 40),
    anchor("center"),
    color(100, 200, 100),
    area(),
  ]).onClick(() => go("highscores"));
});

function applyUpgrade(upgrades, questionNumber) {
  const u = { ...upgrades };
  switch (questionNumber) {
    case 1: u.lives = Math.min(u.lives + 1, 4); break;
    case 2: u.lives = Math.min(u.lives + 1, 4); break;
    case 3: u.lives = Math.min(u.lives + 1, 4); break;
    case 4: u.shieldHits = 2; break;
    case 5: u.shieldHits = 3; break;
    case 6: u.weapon = "spread"; break;
    case 7: u.weapon = "laser"; break;
    case 8: u.smartBombs = 1; break;
    case 9: u.smartBombs = 2; break;
    case 10: u.scoreMultiplier = 1.5; break;
  }
  return u;
}

function upgradeName(qNum) {
  const names = {
    1: "1 Life", 2: "1 Life", 3: "1 Life",
    4: "Shield (2 hits)", 5: "Shield +1 hit",
    6: "Spread Shot", 7: "Laser",
    8: "Smart Bomb", 9: "+1 Smart Bomb",
    10: "1.5× Score",
  };
  return names[qNum] || "Upgrade";
}

const QUESTION_TIME = 8; // seconds per question

scene("quiz", ({ pack, questionIndex, upgrades, level, score = 0 }) => {
  // Filter questions by difficulty based on level
  const targetDiff = level <= 1 ? "easy" : level === 2 ? "medium" : "hard";
  const filtered = pack.questions.filter(q => q.difficulty === targetDiff);
  // Pad with adjacent difficulty if not enough
  const pool = [...filtered, ...pack.questions.filter(q => q.difficulty !== targetDiff)]
    .sort(() => Math.random() - 0.5)
    .slice(0, 10);
  // Use pool instead of pack.questions
  const questions = pool;
  const qNum = questionIndex + 1; // 1-based
  const q = questions[questionIndex];

  // Question number label
  add([
    text(`Q${qNum} of 10`, { size: 16 }),
    pos(20, 16),
    color(180, 180, 180),
  ]);

  // Question text
  add([
    text(q.q, { size: 22, width: 760 }),
    pos(width() / 2, 100),
    anchor("center"),
    color(255, 255, 255),
  ]);

  // Answer buttons
  const colors = [
    [220, 60, 60],
    [60, 160, 220],
    [60, 200, 80],
    [220, 160, 40],
  ];

  let answered = false;

  q.choices.forEach((choice, i) => {
    const col = i < 2 ? 0 : 1;
    const row = i % 2;
    const btnX = 210 + col * 400;
    const btnY = 280 + row * 120;

    const btn = add([
      rect(360, 90, { radius: 10 }),
      pos(btnX, btnY),
      anchor("center"),
      color(...colors[i]),
      area(),
    ]);

    add([
      text(choice, { size: 20, width: 320 }),
      pos(btnX, btnY),
      anchor("center"),
      color(255, 255, 255),
    ]);

    btn.onClick(() => {
      if (answered) return;
      answered = true;
      const correct = i === q.answer;
      const newUpgrades = correct ? applyUpgrade(upgrades, qNum) : upgrades;

      btn.color = correct ? rgb(50, 220, 50) : rgb(220, 50, 50);
      play(correct ? "correct" : "wrong", { volume: 0.6 });

      add([
        text(correct ? "CORRECT! +" + upgradeName(qNum) : "Wrong!", { size: 28 }),
        pos(width() / 2, 480),
        anchor("center"),
        color(correct ? 50 : 220, correct ? 220 : 50, 50),
      ]);

      wait(1.2, () => {
        if (questionIndex + 1 >= questions.length) {
          go("loadout", { upgrades: newUpgrades, pack, level, score });
        } else {
          go("quiz", { pack, questionIndex: questionIndex + 1, upgrades: newUpgrades, level, score });
        }
      });
    });
  });

  // Timer bar background
  add([
    rect(760, 20, { radius: 4 }),
    pos(width() / 2, 220),
    anchor("center"),
    color(60, 60, 60),
  ]);

  // Timer bar (animated)
  const timerBar = add([
    rect(760, 20, { radius: 4 }),
    pos(20, 210),
    color(80, 200, 255),
    { fullWidth: 760 },
  ]);

  let timeLeft = QUESTION_TIME;

  onUpdate(() => {
    if (answered) return;
    timeLeft -= dt();
    const frac = Math.max(timeLeft / QUESTION_TIME, 0);
    timerBar.width = timerBar.fullWidth * frac;
    if (frac < 0.33) timerBar.color = rgb(220, 60, 60);
    else if (frac < 0.66) timerBar.color = rgb(220, 180, 40);

    if (timeLeft <= 0) {
      answered = true;
      play("wrong", { volume: 0.5 });
      add([
        text("Time's up!", { size: 28 }),
        pos(width() / 2, 480),
        anchor("center"),
        color(220, 80, 80),
      ]);
      wait(1.2, () => {
        if (questionIndex + 1 >= questions.length) {
          go("loadout", { upgrades, pack, level, score });
        } else {
          go("quiz", { pack, questionIndex: questionIndex + 1, upgrades, level, score });
        }
      });
    }
  });

  // Progress dots
  for (let i = 0; i < 10; i++) {
    add([
      circle(8),
      pos(width() / 2 - 90 + i * 20, height() - 20),
      anchor("center"),
      color(i < questionIndex ? 80 : i === questionIndex ? 255 : 40,
            i < questionIndex ? 200 : i === questionIndex ? 200 : 40,
            i < questionIndex ? 80 : i === questionIndex ? 80 : 40),
    ]);
  }
});

scene("loadout", ({ upgrades, pack, level, score = 0 }) => {
  add([
    text("YOUR LOADOUT", { size: 36 }),
    pos(width() / 2, 60),
    anchor("center"),
    color(255, 230, 0),
  ]);

  const items = [
    { label: "Lives",           value: "<3 ".repeat(upgrades.lives).trimEnd() },
    { label: "Shield",          value: upgrades.shieldHits > 0 ? `${upgrades.shieldHits} hits` : "None" },
    { label: "Weapon",          value: { blaster: "Blaster", spread: "Spread Shot", laser: "Laser" }[upgrades.weapon] },
    { label: "Smart Bombs",     value: upgrades.smartBombs > 0 ? `${upgrades.smartBombs}` : "None" },
    { label: "Score Multiplier",value: `${upgrades.scoreMultiplier}×` },
  ];

  items.forEach((item, i) => {
    const y = 160 + i * 70;
    wait(i * 0.4, () => {
      add([
        text(item.label + ":", { size: 20 }),
        pos(200, y),
        anchor("left"),
        color(160, 160, 200),
      ]);
      add([
        text(item.value, { size: 24 }),
        pos(460, y),
        anchor("left"),
        color(255, 255, 255),
      ]);
    });
  });

  const totalDelay = items.length * 0.4 + 1.5;
  wait(totalDelay, () => {
    add([
      text("GET READY!", { size: 32 }),
      pos(width() / 2, height() - 80),
      anchor("center"),
      color(80, 220, 80),
    ]);
  });
  wait(totalDelay + 1.2, () => {
    if (level % 5 === 0) {
      go("boss", { upgrades, pack, level, score });
    } else {
      go("shooter", { upgrades, pack, level, score });
    }
  });
});

function addStarfield(level = 1) {
  const themes = [
    { bg: [0, 0, 60],    star: [180, 200, 255], star2: [255, 255, 180] },  // deep space — dark navy
    { bg: [55, 0, 90],   star: [230, 130, 255], star2: [255, 100, 200] },  // nebula — vivid purple
    { bg: [90, 20, 0],   star: [255, 180, 80],  star2: [255, 100, 60]  },  // asteroid — deep red/orange
    { bg: [0, 70, 50],   star: [100, 255, 180], star2: [180, 255, 100] },  // alien world — dark teal
  ];
  const theme = themes[Math.min(level - 1, themes.length - 1)];
  setBackground(...theme.bg);
  const STAR_COUNT = 90;
  const stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const useStar2 = i > STAR_COUNT * 0.6;
    const s = add([
      circle(rand(1, 3.5)),
      pos(rand(0, width()), rand(0, height())),
      color(...(useStar2 ? theme.star2 : theme.star)),
      { speed: rand(40, 130) },
    ]);
    stars.push(s);
  }
  onUpdate(() => {
    for (const s of stars) {
      s.pos.y += s.speed * dt();
      if (s.pos.y > height()) {
        s.pos.y = 0;
        s.pos.x = rand(0, width());
      }
    }
  });
}

function spawnBullets(origin, weapon) {
  if (weapon === "blaster") {
    spawnBullet(origin, vec2(0, -1));
  } else if (weapon === "spread") {
    spawnBullet(origin, vec2(-0.25, -1).unit());
    spawnBullet(origin, vec2(0, -1));
    spawnBullet(origin, vec2(0.25, -1).unit());
  } else if (weapon === "laser") {
    spawnBullet(origin, vec2(0, -1), true);
  }
}

function spawnBullet(origin, dir, isLaser = false) {
  play("shoot", { volume: 0.3 });
  add([
    sprite("bullet"),
    pos(origin),
    anchor("center"),
    area(),
    move(dir, isLaser ? 700 : 500),
    offscreen({ destroy: true }),
    "bullet",
    { damage: isLaser ? 2 : 1 },
  ]);
}

function addExplosion(p) {
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const particle = add([
      circle(rand(3, 7)),
      pos(p),
      color(255, rand(100, 200), 0),
      { vel: vec2(Math.cos(angle) * rand(60, 160), Math.sin(angle) * rand(60, 160)), life: rand(0.3, 0.7) },
    ]);
    onUpdate(() => {
      if (!particle.exists()) return;
      particle.pos = particle.pos.add(particle.vel.scale(dt()));
      particle.life -= dt();
      if (particle.life <= 0) destroy(particle);
    });
  }
}

function flashSprite(obj, col) {
  const orig = obj.color.clone();
  obj.color = col;
  wait(0.12, () => { if (obj.exists()) obj.color = orig; });
}

scene("shooter", ({ upgrades, pack, level, score: prevScore = 0 }) => {
  addStarfield(level);

  const speedMult = 1 + (level - 1) * 0.25;
  const wavesPerLevel = 4 + level;
  let wavesSpawned = 0;
  let levelEnding = false;

  let lives = upgrades.lives;
  let shieldHits = upgrades.shieldHits;
  let smartBombs = upgrades.smartBombs;
  let score = prevScore;
  let scoreMultiplier = upgrades.scoreMultiplier;
  let shotsFired = 0;
  let shotsHit = 0;
  let timeAlive = 0;
  let invincible = false;

  const player = add([
    sprite("ship"),
    pos(width() / 2, height() - 80),
    anchor("center"),
    color(255, 255, 255),
    area(),
    "player",
    { weapon: upgrades.weapon },
  ]);

  // Mouse tracking
  onUpdate(() => {
    player.pos.x = clamp(mousePos().x, 20, width() - 20);
    player.pos.y = clamp(mousePos().y, 20, height() - 20);
  });

  // Keyboard fallback
  const SHIP_SPEED = 320;
  onUpdate(() => {
    if (isKeyDown("left") || isKeyDown("a"))  player.pos.x -= SHIP_SPEED * dt();
    if (isKeyDown("right") || isKeyDown("d")) player.pos.x += SHIP_SPEED * dt();
    if (isKeyDown("up") || isKeyDown("w"))    player.pos.y -= SHIP_SPEED * dt();
    if (isKeyDown("down") || isKeyDown("s"))  player.pos.y += SHIP_SPEED * dt();
    player.pos.x = clamp(player.pos.x, 20, width() - 20);
    player.pos.y = clamp(player.pos.y, 20, height() - 20);
  });

  // Auto-fire
  let fireTimer = 0;
  const FIRE_INTERVAL = { blaster: 0.7, spread: 0.6, laser: 0.45 };

  onUpdate(() => {
    fireTimer -= dt();
    if (fireTimer <= 0) {
      fireTimer = FIRE_INTERVAL[player.weapon] || 0.4;
      spawnBullets(player.pos, player.weapon);
      shotsFired++;
    }
  });

  // Smart bomb
  onKeyPress(["shift", "x"], () => {
    if (smartBombs > 0) {
      smartBombs--;
      updateHUD();
      get("alien").forEach((a) => {
        addExplosion(a.pos);
        score += Math.round(a.points * scoreMultiplier);
        shotsHit++;
        destroy(a);
      });
      get("hpBar").forEach(destroy);
      updateScore();
    }
  });

  // HUD
  const hudLives  = add([text("", { size: 18 }), pos(10, 10), color(255, 80, 80)]);
  const hudBombs  = add([text("", { size: 18 }), pos(10, 34), color(255, 220, 50)]);
  const hudScore  = add([text("", { size: 18 }), pos(width() - 10, 10), anchor("right"), color(255, 255, 255)]);

  function updateHUD() {
    hudLives.text = "Lives: " + lives + (shieldHits > 0 ? "  Shield: " + shieldHits : "");
    hudBombs.text = smartBombs > 0 ? "Bombs: " + smartBombs : "";
  }
  function updateScore() {
    hudScore.text = "Score: " + score;
  }
  updateHUD();
  updateScore();

  // Survival bonus
  onUpdate(() => { timeAlive += dt(); });
  loop(10, () => {
    score += Math.round(100 * scoreMultiplier);
    updateScore();
  });

  // Player hit handler
  function playerHit() {
    if (invincible) return;
    if (shieldHits > 0) {
      shieldHits--;
      updateHUD();
      flashSprite(player, rgb(80, 180, 255));
    } else {
      lives--;
      updateHUD();
      flashSprite(player, rgb(255, 80, 80));
      if (lives <= 0) {
        const accuracy = shotsFired > 0 ? Math.floor((shotsHit / shotsFired) * 1000) : 0;
        go("gameover", { score: score + accuracy, accuracy, timeAlive: Math.floor(timeAlive), level });
      }
    }
    invincible = true;
    wait(1.5, () => { invincible = false; });
  }

  player._hit = playerHit;

  // Alien wave system
  let waveDifficulty = 0;

  loop(30, () => { waveDifficulty++; });

  function spawnWave() {
    if (levelEnding) return;
    wavesSpawned++;
    const count = 4 + waveDifficulty;
    const tankChance = Math.min(0.1 * waveDifficulty, 0.4);
    for (let i = 0; i < count; i++) {
      wait(i * 0.3, () => {
        if (levelEnding) return;
        const isTank = Math.random() < tankChance;
        const isBuzzer = !isTank && Math.random() < 0.35;
        spawnAlien(isTank ? "tank" : isBuzzer ? "buzzer" : "grunt");
      });
    }
    if (wavesSpawned >= wavesPerLevel) {
      levelEnding = true;
      wait(5, () => {
        go("levelcomplete", { upgrades, pack, level, score });
      });
    }
  }

  loop(3.5, spawnWave);
  spawnWave();

  function spawnAlien(type) {
    const configs = {
      grunt:  { w: 36, h: 28, col: [80, 200, 80],   hp: 1, pts: 10,  speed: 60,  zigzag: false, fires: false },
      buzzer: { w: 24, h: 20, col: [200, 80, 200],   hp: 1, pts: 25,  speed: 130, zigzag: true,  fires: true  },
      tank:   { w: 54, h: 40, col: [200, 120, 40],   hp: 3, pts: 50,  speed: 35,  zigzag: false, fires: true  },
    };
    const cfg = configs[type];
    let zigzagTime = 0;
    let swoopPhase = "entry";
    let swoopDirX = 0;

    const alien = add([
      sprite("alien_" + type),
      pos(rand(cfg.w, width() - cfg.w), -cfg.h),
      anchor("center"),
      area(),
      "alien",
      {
        hp: cfg.hp,
        points: cfg.pts,
        speed: cfg.speed,
        zigzag: cfg.zigzag,
        fires: cfg.fires,
        type,
      },
    ]);

    let hpBar = null;
    if (type === "tank") {
      hpBar = add([
        rect(cfg.w, 6),
        pos(alien.pos.x - cfg.w / 2, alien.pos.y - cfg.h / 2 - 8),
        color(80, 220, 80),
        "hpBar",
        { maxW: cfg.w, maxHp: cfg.hp, alien: alien },
      ]);
    }

    alien.onUpdate(() => {
      zigzagTime += dt();

      let moveX = 0;
      let speedY = cfg.speed * speedMult;

      if (type === "grunt") {
        if (swoopPhase === "entry") {
          // gentle wave on the way down
          moveX = Math.sin(zigzagTime * 1.5) * 40 * dt();
          if (alien.pos.y > height() * 0.3) {
            swoopPhase = "swoop";
            swoopDirX = player.pos.x - alien.pos.x; // lock toward player position
          }
        } else {
          // dive at locked angle — player must dodge
          moveX = Math.sign(swoopDirX) * 180 * dt();
          speedY = cfg.speed * 2.5;
        }
      } else if (type === "buzzer") {
        // wide zigzag with speed bursts on downswings
        moveX = Math.sin(zigzagTime * 5) * 160 * dt();
        speedY = cfg.speed * (1 + 0.5 * Math.abs(Math.sin(zigzagTime * 2.5)));
      } else if (type === "tank") {
        // slowly tracks player X — feels like it's aiming
        const dx = player.pos.x - alien.pos.x;
        moveX = Math.sign(dx) * Math.min(Math.abs(dx) * 0.8, 60) * dt();
      }

      alien.pos.x += moveX;
      alien.pos.y += speedY * dt();
      alien.pos.x = clamp(alien.pos.x, 20, width() - 20);

      if (hpBar && hpBar.exists()) {
        hpBar.pos = vec2(alien.pos.x - cfg.w / 2, alien.pos.y - cfg.h / 2 - 8);
        hpBar.width = (alien.hp / hpBar.maxHp) * hpBar.maxW;
      }

      if (alien.pos.y > height() + 60) {
        if (hpBar && hpBar.exists()) destroy(hpBar);
        destroy(alien);
      }
    });

    if (cfg.fires) {
      const fireInterval = type === "tank" ? 2.5 : 1.8;
      const fireLoop = loop(fireInterval, () => {
        if (!alien.exists()) return;
        const dir = type === "tank" ? player.pos.sub(alien.pos).unit() : vec2(0, 1);
        const bulletSpeed = (type === "tank" ? 200 : 160) * Math.min(speedMult, 2);
        add([
          circle(6),
          pos(alien.pos),
          color(255, 80, 80),
          area(),
          move(dir, bulletSpeed),
          offscreen({ destroy: true }),
          "enemyBullet",
        ]);
      });

      alien.onDestroy(() => fireLoop.cancel());
    }
  }

  // Bullet hits alien
  onCollide("bullet", "alien", (bullet, alien) => {
    if (!bullet.exists() || !alien.exists()) return;
    const dmg = bullet.damage || 1;
    alien.hp -= dmg;
    shotsHit++;
    addExplosion(bullet.pos);
    play("hit", { volume: 0.5 });
    destroy(bullet);
    if (alien.hp <= 0) {
      score += Math.round(alien.points * scoreMultiplier);
      updateScore();
      addExplosion(alien.pos);
      get("hpBar").forEach((bar) => {
        if (bar.alien === alien) destroy(bar);
      });
      destroy(alien);
    }
  });

  // Alien hits player
  onCollide("alien", "player", (alien, p) => {
    p._hit();
  });

  // Enemy bullet hits player
  onCollide("enemyBullet", "player", (bullet, p) => {
    destroy(bullet);
    p._hit();
  });

  // Mobile controls — BOMB only (firing is automatic)
  const bombBtn = add([
    rect(90, 60, { radius: 10 }),
    pos(100, height() - 80),
    anchor("center"),
    color(100, 80, 20),
    opacity(0.75),
    area(),
    fixed(),
    "ui",
  ]);
  add([text("BOMB", { size: 18 }), pos(100, height() - 80), anchor("center"), color(255,255,255), fixed(), "ui"]);

  bombBtn.onClick(() => {
    if (smartBombs > 0) {
      smartBombs--;
      updateHUD();
      get("alien").forEach((a) => {
        score += Math.round(a.points * scoreMultiplier);
        shotsHit++;
        addExplosion(a.pos);
        destroy(a);
      });
      get("hpBar").forEach(destroy);
      updateScore();
    }
  });

  onTouchMove((touch) => {
    if (bombBtn.hasPoint(touch.pos)) return;
    player.pos.x = clamp(touch.pos.x, 20, width() - 20);
    player.pos.y = clamp(touch.pos.y, 20, height() - 20);
  });
});

scene("levelcomplete", ({ upgrades, pack, level, score }) => {
  addStarfield(level);

  add([
    text(`LEVEL ${level} COMPLETE!`, { size: 42 }),
    pos(width() / 2, 120),
    anchor("center"),
    color(80, 220, 80),
  ]);

  add([
    text(`Score so far: ${score}`, { size: 26 }),
    pos(width() / 2, 220),
    anchor("center"),
    color(220, 220, 255),
  ]);

  add([
    text(`Entering Level ${level + 1}`, { size: 22 }),
    pos(width() / 2, 290),
    anchor("center"),
    color(200, 200, 200),
  ]);

  add([
    text("Quiz time! Earn upgrades for the next level.", { size: 18 }),
    pos(width() / 2, 350),
    anchor("center"),
    color(160, 160, 200),
  ]);

  let countdown = 4;
  const countLabel = add([
    text(`Starting in ${countdown}...`, { size: 20 }),
    pos(width() / 2, 430),
    anchor("center"),
    color(150, 150, 150),
  ]);

  loop(1, () => {
    countdown--;
    if (countdown <= 0) {
      go("quiz", { pack, questionIndex: 0, upgrades, level: level + 1, score });
    } else {
      countLabel.text = `Starting in ${countdown}...`;
    }
  });
});

scene("boss", ({ upgrades, pack, level, score: prevScore = 0 }) => {
  addStarfield(level);

  let score = prevScore;
  let lives = upgrades.lives;
  let shieldHits = upgrades.shieldHits;
  let smartBombs = upgrades.smartBombs;
  let scoreMultiplier = upgrades.scoreMultiplier;
  let shotsFired = 0;
  let shotsHit = 0;
  let timeAlive = 0;
  let invincible = false;

  // Which boss type (1-4) and how many times we've seen this boss
  const bossIndex = Math.floor((level / 5 - 1)) % 4; // 0-3
  const bossVisit = Math.floor((level / 5 - 1) / 4) + 1; // 1, 2, 3...

  const bossDefs = [
    {
      name: "VANGUARD",
      color: [20, 180, 160],
      w: 90, h: 55,
      baseHp: 60,
      wingColor: [10, 120, 110],
      coreColor: [180, 255, 240],
    },
    {
      name: "REAPER",
      color: [130, 30, 180],
      w: 70, h: 70,
      baseHp: 140,
      wingColor: [90, 20, 130],
      coreColor: [255, 80, 220],
    },
    {
      name: "BEHEMOTH",
      color: [180, 20, 20],
      w: 130, h: 70,
      baseHp: 280,
      wingColor: [120, 10, 10],
      coreColor: [255, 150, 50],
    },
    {
      name: "OMNIDREAD",
      color: [30, 30, 30],
      w: 100, h: 80,
      baseHp: 450,
      wingColor: [60, 60, 60],
      coreColor: [255, 180, 0],
    },
  ];

  const def = bossDefs[bossIndex];
  const bossMaxHp = Math.floor(def.baseHp * bossVisit * (1 + (level - 5) * 0.05));
  let bossHp = bossMaxHp;
  let bossTime = 0;
  let bossDefeated = false;

  const speedMult = 1 + (level - 1) * 0.25;

  // --- Boss name + HP bar ---
  add([
    text(def.name, { size: 22 }),
    pos(width() / 2, 18),
    anchor("center"),
    color(...def.color),
  ]);

  const hpBarBg = add([
    rect(500, 20, { radius: 4 }),
    pos(width() / 2, 42),
    anchor("center"),
    color(60, 20, 20),
  ]);

  const hpBar = add([
    rect(500, 20, { radius: 4 }),
    pos(width() / 2 - 250, 32),
    color(220, 40, 40),
    { maxW: 500 },
  ]);

  // --- Player ---
  const player = add([
    sprite("ship"),
    pos(width() / 2, height() - 80),
    anchor("center"),
    color(255, 255, 255),
    area(),
    "player",
    { weapon: upgrades.weapon },
  ]);

  // Mouse tracking
  onUpdate(() => {
    player.pos.x = clamp(mousePos().x, 20, width() - 20);
    player.pos.y = clamp(mousePos().y, 60, height() - 20);
  });

  const SHIP_SPEED = 320;
  onUpdate(() => {
    if (isKeyDown("left") || isKeyDown("a"))  player.pos.x -= SHIP_SPEED * dt();
    if (isKeyDown("right") || isKeyDown("d")) player.pos.x += SHIP_SPEED * dt();
    if (isKeyDown("up") || isKeyDown("w"))    player.pos.y -= SHIP_SPEED * dt();
    if (isKeyDown("down") || isKeyDown("s"))  player.pos.y += SHIP_SPEED * dt();
    player.pos.x = clamp(player.pos.x, 20, width() - 20);
    player.pos.y = clamp(player.pos.y, 60, height() - 20);
  });

  let fireTimer = 0;
  const FIRE_INTERVAL = { blaster: 0.7, spread: 0.6, laser: 0.45 };
  onUpdate(() => {
    fireTimer -= dt();
    if (fireTimer <= 0) {
      fireTimer = FIRE_INTERVAL[player.weapon] || 0.4;
      spawnBullets(player.pos, player.weapon);
      shotsFired++;
    }
  });

  onKeyPress(["shift", "x"], () => {
    if (smartBombs > 0) {
      smartBombs--;
      updateHUD();
      bossHp = Math.max(1, bossHp - 40);
      updateBossBar();
      addExplosion(bossBody.pos);
    }
  });

  const hudLives = add([text("", { size: 18 }), pos(10, 10), color(255, 80, 80)]);
  const hudBombs = add([text("", { size: 18 }), pos(10, 34), color(255, 220, 50)]);
  const hudScore = add([text("", { size: 18 }), pos(width() - 10, 10), anchor("right"), color(255, 255, 255)]);

  function updateHUD() {
    hudLives.text = "Lives: " + lives + (shieldHits > 0 ? "  Shield: " + shieldHits : "");
    hudBombs.text = smartBombs > 0 ? "Bombs: " + smartBombs : "";
  }
  function updateScore() {
    hudScore.text = "Score: " + score;
  }
  function updateBossBar() {
    hpBar.width = Math.max(0, (bossHp / bossMaxHp) * hpBar.maxW);
  }
  updateHUD();
  updateScore();

  onUpdate(() => { timeAlive += dt(); });

  function playerHit() {
    if (invincible) return;
    if (shieldHits > 0) {
      shieldHits--;
      updateHUD();
      flashSprite(player, rgb(80, 180, 255));
    } else {
      lives--;
      updateHUD();
      flashSprite(player, rgb(255, 80, 80));
      if (lives <= 0) {
        const accuracy = shotsFired > 0 ? Math.floor((shotsHit / shotsFired) * 1000) : 0;
        go("gameover", { score: score + accuracy, accuracy, timeAlive: Math.floor(timeAlive), level });
      }
    }
    invincible = true;
    wait(1.5, () => { invincible = false; });
  }

  // --- Boss body (hitbox) ---
  const bossBody = add([
    rect(def.w, def.h, { radius: 6 }),
    pos(width() / 2, 120),
    anchor("center"),
    color(...def.color),
    area(),
    "boss",
    { hp: bossHp },
  ]);

  // Decorative parts — follow bossBody in onUpdate
  const parts = [];

  if (bossIndex === 0) {
    // Vanguard: swept wings
    parts.push(add([rect(55, 18, { radius: 3 }), pos(0, 0), anchor("center"), color(...def.wingColor)]));
    parts.push(add([rect(55, 18, { radius: 3 }), pos(0, 0), anchor("center"), color(...def.wingColor)]));
    parts.push(add([circle(10), pos(0, 0), anchor("center"), color(...def.coreColor)]));
  } else if (bossIndex === 1) {
    // Reaper: twin downward prongs
    parts.push(add([rect(22, 55, { radius: 3 }), pos(0, 0), anchor("center"), color(...def.wingColor)]));
    parts.push(add([rect(22, 55, { radius: 3 }), pos(0, 0), anchor("center"), color(...def.wingColor)]));
    parts.push(add([circle(14), pos(0, 0), anchor("center"), color(...def.coreColor)]));
  } else if (bossIndex === 2) {
    // Behemoth: side cannons + top turret
    parts.push(add([rect(18, 45, { radius: 2 }), pos(0, 0), anchor("center"), color(...def.wingColor)]));
    parts.push(add([rect(18, 45, { radius: 2 }), pos(0, 0), anchor("center"), color(...def.wingColor)]));
    parts.push(add([rect(32, 28, { radius: 3 }), pos(0, 0), anchor("center"), color(...def.wingColor)]));
    parts.push(add([circle(12), pos(0, 0), anchor("center"), color(...def.coreColor)]));
  } else {
    // Omnidread: orbiting golden orbs
    parts.push(add([circle(14), pos(0, 0), anchor("center"), color(...def.coreColor)]));
    parts.push(add([circle(14), pos(0, 0), anchor("center"), color(...def.coreColor)]));
    parts.push(add([circle(22), pos(0, 0), anchor("center"), color(...def.wingColor)]));
  }

  // Update part positions relative to boss each frame
  onUpdate(() => {
    if (!bossBody.exists()) return;
    const bx = bossBody.pos.x;
    const by = bossBody.pos.y;

    if (bossIndex === 0) {
      parts[0].pos = vec2(bx - 68, by + 8);
      parts[1].pos = vec2(bx + 68, by + 8);
      parts[2].pos = vec2(bx, by);
    } else if (bossIndex === 1) {
      parts[0].pos = vec2(bx - 38, by + 40);
      parts[1].pos = vec2(bx + 38, by + 40);
      parts[2].pos = vec2(bx, by);
    } else if (bossIndex === 2) {
      parts[0].pos = vec2(bx - 74, by + 5);
      parts[1].pos = vec2(bx + 74, by + 5);
      parts[2].pos = vec2(bx, by - 38);
      parts[3].pos = vec2(bx, by);
    } else {
      const orbitR = 50 + Math.sin(bossTime * 2) * 8;
      parts[0].pos = vec2(bx + Math.cos(bossTime * 1.8) * orbitR, by + Math.sin(bossTime * 1.8) * orbitR * 0.5);
      parts[1].pos = vec2(bx + Math.cos(bossTime * 1.8 + Math.PI) * orbitR, by + Math.sin(bossTime * 1.8 + Math.PI) * orbitR * 0.5);
      parts[2].pos = vec2(bx, by);
    }
  });

  // --- Boss movement ---
  onUpdate(() => {
    if (bossDefeated) return;
    bossTime += dt();

    let tx, ty;
    if (bossIndex === 0) {
      // Vanguard: smooth horizontal sweep
      tx = width() / 2 + Math.sin(bossTime * 0.8) * 280;
      ty = 120;
    } else if (bossIndex === 1) {
      // Reaper: figure-8
      tx = width() / 2 + Math.sin(bossTime * 1.2) * 260;
      ty = 110 + Math.sin(bossTime * 0.6) * 50;
    } else if (bossIndex === 2) {
      // Behemoth: slow sweep + periodic dives
      tx = width() / 2 + Math.sin(bossTime * 0.5) * 220;
      ty = 120 + Math.abs(Math.sin(bossTime * 0.35)) * 80;
    } else {
      // Omnidread: complex orbit
      tx = width() / 2 + Math.sin(bossTime * 1.5) * 240;
      ty = 110 + Math.sin(bossTime * 0.7 + 1.0) * 70;
    }

    bossBody.pos.x += (tx - bossBody.pos.x) * 3 * dt();
    bossBody.pos.y += (ty - bossBody.pos.y) * 3 * dt();
  });

  // --- Boss attacks ---
  function fireBossSpread(count, speedBase) {
    const angleStep = Math.PI / (count + 1);
    for (let i = 1; i <= count; i++) {
      const spreadAngle = Math.PI / 2 + (i - (count + 1) / 2) * (Math.PI / 6);
      const d = vec2(Math.cos(spreadAngle), Math.sin(spreadAngle));
      add([
        circle(5),
        pos(bossBody.pos),
        color(255, 100, 50),
        area(),
        move(d, 180 * Math.min(speedMult, 2)),
        offscreen({ destroy: true }),
        "enemyBullet",
      ]);
    }
  }

  function fireAimed() {
    if (!bossBody.exists()) return;
    const dir = player.pos.sub(bossBody.pos).unit();
    add([
      circle(6),
      pos(bossBody.pos),
      color(255, 60, 200),
      area(),
      move(dir, 200 * Math.min(speedMult, 2)),
      offscreen({ destroy: true }),
      "enemyBullet",
    ]);
  }

  function fireSpiral() {
    if (!bossBody.exists()) return;
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + bossTime;
      const dir = vec2(Math.cos(angle), Math.sin(angle));
      add([
        circle(5),
        pos(bossBody.pos),
        color(255, 200, 0),
        area(),
        move(dir, 160 * Math.min(speedMult, 2)),
        offscreen({ destroy: true }),
        "enemyBullet",
      ]);
    }
  }

  // Vanguard: triple spread every 2.5s
  if (bossIndex === 0) {
    loop(2.5, () => { if (!bossDefeated && bossBody.exists()) fireBossSpread(3, 180); });
  }

  // Reaper: aimed every 1.5s + burst every 6s
  if (bossIndex === 1) {
    loop(1.5, () => { if (!bossDefeated && bossBody.exists()) fireAimed(); });
    loop(6, () => { if (!bossDefeated && bossBody.exists()) fireBossSpread(5, 160); });
  }

  // Behemoth: 5-way spread every 2s + spawn grunts every 8s
  if (bossIndex === 2) {
    loop(2, () => { if (!bossDefeated && bossBody.exists()) fireBossSpread(5, 160); });
    loop(8, () => {
      if (!bossDefeated && bossBody.exists()) {
        for (let i = 0; i < 2; i++) {
          wait(i * 0.4, () => {
            if (!bossBody.exists()) return;
            const g = add([
              sprite("alien_grunt"),
              pos(bossBody.pos.x + (i === 0 ? -60 : 60), bossBody.pos.y + 40),
              anchor("center"),
              area(),
              "alien",
              { hp: 1, points: 15, speed: 70 * speedMult, zigzag: false, fires: false, type: "grunt" },
            ]);
            g.onUpdate(() => {
              g.pos.y += g.speed * dt();
              if (g.pos.y > height() + 60) destroy(g);
            });
          });
        }
      }
    });
  }

  // Omnidread: aimed every 1.2s + spiral every 4s
  if (bossIndex === 3) {
    loop(1.2, () => { if (!bossDefeated && bossBody.exists()) fireAimed(); });
    loop(4, () => { if (!bossDefeated && bossBody.exists()) fireSpiral(); });
    loop(7, () => { if (!bossDefeated && bossBody.exists()) fireBossSpread(7, 170); });
  }

  // --- Collisions ---
  onCollide("bullet", "boss", (bullet, boss) => {
    if (!bullet.exists() || !bossBody.exists()) return;
    const dmg = bullet.damage || 1;
    bossHp -= dmg;
    shotsHit++;
    addExplosion(bullet.pos);
    play("hit", { volume: 0.4 });
    destroy(bullet);
    updateBossBar();

    if (bossHp <= 0 && !bossDefeated) {
      bossDefeated = true;
      // Big explosion
      for (let i = 0; i < 5; i++) {
        wait(i * 0.15, () => addExplosion(vec2(
          bossBody.pos.x + rand(-def.w / 2, def.w / 2),
          bossBody.pos.y + rand(-def.h / 2, def.h / 2)
        )));
      }
      const bossScore = Math.floor(def.baseHp * 10 * bossVisit * scoreMultiplier);
      score += bossScore;
      updateScore();
      parts.forEach(p => { if (p.exists()) destroy(p); });
      destroy(bossBody);
      wait(1.5, () => go("levelcomplete", { upgrades, pack, level, score }));
    }
  });

  onCollide("alien", "player", (alien, p) => { p._hit(); });
  onCollide("enemyBullet", "player", (bullet, p) => { destroy(bullet); p._hit(); });
  onCollide("boss", "player", (boss, p) => { p._hit(); });

  player._hit = playerHit;
});

scene("gameover", ({ score, accuracy, timeAlive, level = 1 }) => {
  addStarfield(1);
  play("gameover", { volume: 0.7 });

  add([
    text("GAME OVER", { size: 48 }),
    pos(width() / 2, 80),
    anchor("center"),
    color(255, 60, 60),
  ]);

  add([
    text(`Score: ${score}\nLevel reached: ${level}\nAccuracy bonus: ${accuracy}\nTime alive: ${timeAlive}s`, { size: 22 }),
    pos(width() / 2, 180),
    anchor("center"),
    color(220, 220, 255),
  ]);

  add([text("Enter your name:", { size: 20 }), pos(width()/2, 300), anchor("center"), color(200, 200, 200)]);

  let nameChars = ["A", "A", "A"];
  let cursor = 0;

  const nameDisplay = add([
    text(nameChars.join(" "), { size: 36 }),
    pos(width() / 2, 350),
    anchor("center"),
    color(255, 230, 0),
  ]);

  add([text("< > to move   ^ v to change   ENTER to save", { size: 14 }), pos(width()/2, 400), anchor("center"), color(150, 150, 150)]);

  function updateNameDisplay() {
    nameDisplay.text = nameChars.map((c, i) => i === cursor ? `(${c})` : c).join(" ");
  }
  updateNameDisplay();

  onKeyPress("left",  () => { cursor = (cursor + 2) % 3; updateNameDisplay(); });
  onKeyPress("right", () => { cursor = (cursor + 1) % 3; updateNameDisplay(); });
  onKeyPress("up",    () => { nameChars[cursor] = String.fromCharCode((nameChars[cursor].charCodeAt(0) - 65 + 1) % 26 + 65); updateNameDisplay(); });
  onKeyPress("down",  () => { nameChars[cursor] = String.fromCharCode((nameChars[cursor].charCodeAt(0) - 65 + 25) % 26 + 65); updateNameDisplay(); });

  onKeyPress("enter", () => {
    saveScore(nameChars.join(""), score);
    go("highscores");
  });

  // Share button
  const shareBtn = add([
    rect(260, 50, { radius: 8 }),
    pos(width() / 2, height() - 60),
    anchor("center"),
    color(30, 120, 30),
    area(),
  ]);
  add([text("Share Score!", { size: 20 }), pos(width()/2, height()-60), anchor("center"), color(255,255,255)]);

  shareBtn.onClick(() => {
    const msg = `I scored ${score} in Alien Quiz Shooter! Can you beat me? ${location.href}`;
    if (navigator.share) {
      navigator.share({ title: "Alien Quiz Shooter", text: msg, url: location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(msg).then(() => {
        add([text("Copied!", { size: 18 }), pos(width()/2, height()-110), anchor("center"), color(80, 220, 80)]);
      });
    }
  });
});

scene("highscores", () => {
  addStarfield(1);

  add([text("HIGH SCORES", { size: 40 }), pos(width()/2, 50), anchor("center"), color(255, 230, 0)]);

  const scores = loadScores();
  if (scores.length === 0) {
    add([text("No scores yet - play a game!", { size: 22 }), pos(width()/2, 200), anchor("center"), color(180, 180, 180)]);
  } else {
    scores.forEach((entry, i) => {
      add([
        text(`${i + 1}. ${entry.name}   ${entry.score}`, { size: 22 }),
        pos(width() / 2, 130 + i * 38),
        anchor("center"),
        color(i === 0 ? rgb(255, 220, 0) : rgb(220, 220, 220)),
      ]);
    });
  }

  add([
    text("Press ENTER or ESC to return", { size: 16 }),
    pos(width() / 2, height() - 30),
    anchor("center"),
    color(130, 130, 130),
  ]);

  onKeyPress(["enter", "escape"], () => loadPacks().then((packs) => go("title", packs)));
});

loadPacks().then((packs) => go("title", packs));
