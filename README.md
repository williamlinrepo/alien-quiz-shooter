# Alien Quiz Shooter

A browser-based space shooter with an educational quiz phase. Built with [KAPLAY](https://kaplayjs.com/).

## Play

Open the live URL: `https://georgelinrepo.github.io/alienquizshooter`

## Run locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Add a topic pack

1. Create a JSON file in `assets/packs/` following this schema:

```json
{
  "name": "My Pack",
  "description": "Short description",
  "questions": [
    { "q": "Question text?", "choices": ["A", "B", "C", "D"], "answer": 0 }
  ]
}
```

2. Add the filename to `assets/packs/index.json`.
3. Commit and push — it's live immediately.

## Assets needed (download manually)

Before the game has sprites, download these and place them in `assets/sprites/`:
- `ship.png` — player ship sprite
- `alien_grunt.png` — grunt alien sprite
- `alien_buzzer.png` — buzzer alien sprite
- `alien_tank.png` — tank alien sprite
- `bullet.png` — bullet sprite

Source: [Kenney Space Shooter Redux](https://kenney.nl/assets/space-shooter-redux) (CC0 license)

And these in `assets/audio/`:
- `shoot.wav`, `hit.wav`, `correct.wav`, `wrong.wav`, `gameover.wav`

Source: [jsfxr](https://sfxr.me/) (CC0 license)
