# 1029 — your anniversary site

Open `index.html` in a browser (or through a local server like VS Code's Live Server,
`http://localhost:5500`) to preview it. Nothing needs to be installed or built — it's plain
HTML, CSS, and JavaScript, and every path is relative, so it works the same locally as it
will wherever you eventually host it.

## Building and testing it (PREVIEW_MODE)

At the top of `script.js` there's:

```javascript
const PREVIEW_MODE = true;
```

While this is `true`, the real date lock is bypassed for you: refreshing the page takes you
straight to the padlock, and entering `1029` gives you the entire site — memories, letter,
music, counter, navigation, animations, everything — so you can build and test freely.

**Before sharing the real link, set it back to `false`.** That's what puts the actual date
lock back in force. The underlying check never changes — it's always "is it October 29, 2026,
Manila time, or later"; `PREVIEW_MODE` only ever adds an OR in front of that, it doesn't touch
or weaken it.

### Dev panel

While `PREVIEW_MODE` is `true`, press **Ctrl+Shift+P** anywhere on the page to open a small
developer panel (top-left, monospace, clearly not part of the actual design) with:

- **Preview Mode: ON/OFF** — flips the bypass on/off for this session, so you can also see
  the locked countdown screen without editing the file.
- **Skip Date Lock** — jumps straight past the countdown to the padlock.
- **Test Padlock** — resets and shows the padlock screen again.
- **Test Music** — plays/pauses the audio without needing the floating button.
- **Reset Website** — reloads the page from scratch.
- **Close Developer Panel** — hides the panel again.

When `PREVIEW_MODE` is `false`, this panel doesn't exist at all — no shortcut listener is
even attached — so a normal visitor has no way to find or open it.

## What to personalize

- **Photos** — drop your images into `assets/photos/` as `memory-01.jpg`, `memory-02.jpg`, etc.
  Each memory card in `index.html` (look for the `MEMORIES — EDIT CONTENT HERE` comment) has a
  `--photo: url('assets/photos/memory-0N.jpg')` line — point it at your file, then fill in the
  visible date/title text and the `data-date` / `data-location` / `data-desc` attributes on
  that same card. Copy a whole `<article class="memory-card">…</article>` block to add more.
- **The letter** — find `LETTER — EDIT CONTENT HERE` in `index.html` and replace the placeholder
  paragraph with your own words. Add as many `<p>` paragraphs as you like.
- **The music** — add your audio file at `assets/music/libu-libong-buwan.mp3` (same filename,
  or update the `src` on the `<audio>` element near the bottom of `index.html`). It never
  autoplays — the visitor has to press the floating music button first.
- **The password, the two dates, and (optionally) a name** — all at the top of `script.js`,
  in one place:

  ```javascript
  const anniversaryConfig = {
    relationshipStart: "2022-10-29", // what the live counter counts from
    anniversaryDate: "2026-10-29",   // when the site unlocks, Manila time
    password: "1029",
    partnerName: "YOUR PARTNER'S NAME",
  };
  ```

  Both dates are read as Manila-time midnight, so you only ever need to write a plain
  `YYYY-MM-DD` — no manual UTC math required.

## Notes

- Fonts (Fraunces, Inter) load from Google Fonts, so an internet connection is needed the
  first time a browser opens the page.
- The whole thing respects "reduce motion" accessibility settings automatically.
- Remember: `PREVIEW_MODE = false` before this goes anywhere near your partner.
