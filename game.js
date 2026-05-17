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

scene("quiz", (data) => {
  add([text("QUIZ (stub)"), pos(width()/2, height()/2), anchor("center")]);
});

scene("highscores", () => {
  add([text("HIGH SCORES (stub)"), pos(width()/2, height()/2), anchor("center")]);
  onKeyPress("escape", () => loadPacks().then((packs) => go("title", packs)));
});

loadPacks().then((packs) => go("title", packs));
