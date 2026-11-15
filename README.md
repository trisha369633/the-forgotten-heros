# The Forgotten Heroes

A React + Vite interactive storybook with ten React Router chapter URLs. Run it locally:

```sh
npm install
npm run dev
```

## Story and media

The nine story chapter titles and narration belong in `src/data/chapters.js` and their chapter modules under `src/chapters/`. The project files supplied so far did not include the original prototype or story text, so those chapter modules intentionally show a notice rather than invented narration. Chapter 10 is reserved for project-owner-created puzzles.

Place the permanent space background at `public/backgrounds/space-background.jpg`. Chapter media paths are defined in `src/data/chapters.js` and follow this public-folder layout:

- `public/media/chapter-01/images/chapter-01.jpg`
- `public/media/chapter-01/audio/narration.mp3`
- `public/media/chapter-01/videos/chapter-01.mp4`

Use the corresponding `chapter-02` through `chapter-10` folders. Background music is read from `public/backgrounds/backgroundsound.wav` and attempts to start automatically. If the browser blocks audio autoplay, use the labeled Background sound button to start it; the button mutes playback once it is on. The music loops, plays at 30% volume, and lowers to 20% while chapter narration is playing. Missing media is reported in the book UI.

## Checks

```sh
npm run build
npm run lint
```
# the-forgotten-heros
