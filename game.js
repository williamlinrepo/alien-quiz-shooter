kaplay({
  width: 800,
  height: 600,
  letterbox: true,
  background: [0, 0, 20],
});

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
      go("quiz", { pack, questionIndex: 0, upgrades: defaultUpgrades() });
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

scene("quiz", ({ pack, questionIndex, upgrades }) => {
  const questions = pack.questions;
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

      add([
        text(correct ? "CORRECT! +" + upgradeName(qNum) : "Wrong!", { size: 28 }),
        pos(width() / 2, 480),
        anchor("center"),
        color(correct ? 50 : 220, correct ? 220 : 50, 50),
      ]);

      wait(1.2, () => {
        if (questionIndex + 1 >= questions.length) {
          go("loadout", { upgrades: newUpgrades, pack });
        } else {
          go("quiz", { pack, questionIndex: questionIndex + 1, upgrades: newUpgrades });
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
      add([
        text("Time's up!", { size: 28 }),
        pos(width() / 2, 480),
        anchor("center"),
        color(220, 80, 80),
      ]);
      wait(1.2, () => {
        if (questionIndex + 1 >= questions.length) {
          go("loadout", { upgrades, pack });
        } else {
          go("quiz", { pack, questionIndex: questionIndex + 1, upgrades });
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

scene("loadout", ({ upgrades, pack }) => {
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
  wait(totalDelay + 1.2, () => go("shooter", { upgrades, pack }));
});

function addStarfield() {
  const STAR_COUNT = 80;
  const stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const s = add([
      circle(rand(1, 2.5)),
      pos(rand(0, width()), rand(0, height())),
      color(200, 200, 255),
      { speed: rand(40, 120) },
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
  add([
    rect(isLaser ? 6 : 8, isLaser ? 28 : 16),
    pos(origin),
    anchor("center"),
    color(isLaser ? 255 : 255, isLaser ? 80 : 255, isLaser ? 80 : 0),
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

function flash(obj, col) {
  const orig = obj.color;
  obj.color = col;
  wait(0.12, () => { if (obj.exists()) obj.color = orig; });
}

scene("shooter", ({ upgrades }) => {
  addStarfield();

  let lives = upgrades.lives;
  let shieldHits = upgrades.shieldHits;
  let smartBombs = upgrades.smartBombs;
  let score = 0;
  let scoreMultiplier = upgrades.scoreMultiplier;
  let shotsFired = 0;
  let shotsHit = 0;
  let timeAlive = 0;
  let invincible = false;

  const player = add([
    rect(40, 50, { radius: 6 }),
    pos(width() / 2, height() - 80),
    anchor("center"),
    color(80, 180, 255),
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

  // Firing
  let fireTimer = 0;
  const FIRE_INTERVAL = { blaster: 0.25, spread: 0.22, laser: 0.15 };

  onUpdate(() => {
    if (isKeyDown("space")) {
      fireTimer -= dt();
      if (fireTimer <= 0) {
        fireTimer = FIRE_INTERVAL[player.weapon] || 0.25;
        spawnBullets(player.pos, player.weapon);
        shotsFired++;
      }
    } else {
      fireTimer = 0;
    }
  });

  // Smart bomb
  onKeyPress(["shift", "x"], () => {
    if (smartBombs > 0) {
      smartBombs--;
      updateHUD();
      every("alien", (a) => {
        addExplosion(a.pos);
        score += Math.round(a.points * scoreMultiplier);
        shotsHit++;
        destroy(a);
      });
      every("hpBar", destroy);
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
      flash(player, rgb(80, 180, 255));
    } else {
      lives--;
      updateHUD();
      flash(player, rgb(255, 80, 80));
      if (lives <= 0) {
        const accuracy = shotsFired > 0 ? Math.floor((shotsHit / shotsFired) * 1000) : 0;
        go("gameover", { score: score + accuracy, accuracy, timeAlive: Math.floor(timeAlive) });
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
    const count = 4 + waveDifficulty;
    const tankChance = Math.min(0.1 * waveDifficulty, 0.4);
    for (let i = 0; i < count; i++) {
      wait(i * 0.3, () => {
        const isTank = Math.random() < tankChance;
        const isBuzzer = !isTank && Math.random() < 0.35;
        spawnAlien(isTank ? "tank" : isBuzzer ? "buzzer" : "grunt");
      });
    }
  }

  loop(3.5, spawnWave);
  spawnWave();

  function spawnAlien(type) {
    const configs = {
      grunt:  { w: 36, h: 28, col: [80, 200, 80],   hp: 1, pts: 10,  speed: 60,  zigzag: false, fires: false },
      buzzer: { w: 24, h: 20, col: [200, 80, 200],   hp: 1, pts: 25,  speed: 130, zigzag: true,  fires: false },
      tank:   { w: 54, h: 40, col: [200, 120, 40],   hp: 3, pts: 50,  speed: 35,  zigzag: false, fires: true  },
    };
    const cfg = configs[type];
    let zigzagTime = 0;

    const alien = add([
      rect(cfg.w, cfg.h, { radius: 4 }),
      pos(rand(cfg.w, width() - cfg.w), -cfg.h),
      anchor("center"),
      color(...cfg.col),
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
      const zigX = cfg.zigzag ? Math.sin(zigzagTime * 4) * 120 * dt() : 0;
      alien.pos.x += zigX;
      alien.pos.y += cfg.speed * dt();
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
      const fireLoop = loop(2.5, () => {
        if (!alien.exists()) return;
        add([
          circle(6),
          pos(alien.pos),
          color(255, 80, 80),
          area(),
          move(vec2(0, 1), 160),
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
    destroy(bullet);
    if (alien.hp <= 0) {
      score += Math.round(alien.points * scoreMultiplier);
      updateScore();
      addExplosion(alien.pos);
      every("hpBar", (bar) => {
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
});

scene("gameover", (data) => {
  add([text("GAME OVER (stub)\nScore: " + data.score, { size: 28 }), pos(width()/2, height()/2), anchor("center")]);
});

scene("highscores", () => {
  add([text("HIGH SCORES (stub)"), pos(width()/2, height()/2), anchor("center")]);
  onKeyPress("escape", () => loadPacks().then((packs) => go("title", packs)));
});

loadPacks().then((packs) => go("title", packs));
