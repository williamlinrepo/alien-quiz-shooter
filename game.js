kaplay({
  width: 800,
  height: 600,
  letterbox: true,
  background: [0, 0, 20],
});

scene("title", () => {
  add([
    text("ALIEN QUIZ SHOOTER", { size: 32 }),
    pos(width() / 2, height() / 2),
    anchor("center"),
    color(255, 255, 0),
  ]);
});

go("title");
