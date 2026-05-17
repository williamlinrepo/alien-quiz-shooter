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
  add([text("LOADOUT (stub)"), pos(width()/2, height()/2), anchor("center")]);
  wait(2, () => go("shooter", { upgrades, pack }));
});

scene("shooter", (data) => {
  add([text("SHOOTER (stub)"), pos(width()/2, height()/2), anchor("center")]);
});

scene("highscores", () => {
  add([text("HIGH SCORES (stub)"), pos(width()/2, height()/2), anchor("center")]);
  onKeyPress("escape", () => loadPacks().then((packs) => go("title", packs)));
});

loadPacks().then((packs) => go("title", packs));
