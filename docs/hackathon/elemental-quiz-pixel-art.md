# Elemental quiz: pixel art

The quiz "คุณคือธาตุอะไร" (`/hackathon/elemental/quiz`) gives each person one of
five elements. Each result shows the brand's flat 9x9 icon from Instagram
slide 2, unchanged, and plays a short pixel **effect** round it: fire throws
sparks, earth sheds a pebble, water drips, air gusts through, aether
flickers. Above each result hangs its **crest**. Both are drawn by hand as
grids in `lib/hackathon/elemental/quiz-pixel-art.ts`.

- **Effect**: 8 frames on a 15x15 stage, with the icon's 9x9 box at columns
  and rows 3..11. One stage cell is one icon pixel, so the effect is drawn at
  the icon's own pixel size. Frame 0 is the still: the share cards show it,
  and so does the page for people who turn motion off.
  - Story card: 26 px a pixel. Link preview: 26. Result page: 12.
  - Quiz intro: 4 under 390 px wide, 5 on phones, 6 wider up. Reveal: 18.
  - Small icons (the need box, the brief, the menus) stay still, with no effect.
- **Crest**, 30x8: the element's corruption hanging in from the top edge of a
  card. It tiles sideways (column 29 runs on into column 0). 36 px a pixel on
  the Story card, 16 on the link preview, 12 on phones and 16 wider up.

One character per brand colour (`PIXEL_PALETTE` in `quiz-pixels.ts`), `.` for
clear. In an effect frame, a colour on an empty cell is an effect pixel, a
colour on an icon cell recolours it for that frame, and `-` hides it for that
frame. The web page (`components/hackathon/elemental/quiz/PixelArt.tsx`) and
the cards (`lib/og/elemental-quiz.ts`) both draw from these grids.

## Rules

1. **The icon stays the icon.** Never redraw it; the effect plays round it.
   At most 3 icon pixels change in a frame, and none in the still.
2. **Whole pixels only.** Art is always drawn at a whole number of screen
   pixels per art pixel, and never stretched. Icons sit at multiples of 9.
3. **Whole steps only.** A frame shows whole, then the next replaces it
   (`steps`, no fades), and a particle moves at most one pixel a frame.
4. **Nothing random.** Every pixel is placed. A lone pixel is a spark, drop,
   grain or glint, never noise.
5. **Sparse.** About 3 to 9 effect pixels a frame. The icon must still read
   first.
6. **Brand colours only,** each element on its own ramp: fire `e f l c w`,
   earth `b r y`, water `T C G`, air `s a`, aether `g v L`. Cream (`k`) is
   the one shared highlight (not on aether).
7. **The still must stand alone:** the effect caught mid-action, within
   columns 1..13 so it never touches a card edge.
8. **It loops.** Frame 7 runs into frame 0 with no hitch.
9. **Room to move.** An effect reaches 3 pixels past its icon. Layout lines
   up the icon's 9x9 box and leaves that room clear of text.
10. **Only aether glows** (brand rule).

`lib/hackathon/elemental/__tests__/quiz-pixels.test.ts` enforces the sizes,
colours, the untouched icon and the crest density. For everything else:

```bash
python3 scripts/elemental-quiz-pixels.py check  lib/hackathon/elemental/quiz-pixel-art.ts
python3 scripts/elemental-quiz-pixels.py render lib/hackathon/elemental/quiz-pixel-art.ts /tmp/quiz-art
```

Look at the renders, not the grid text: each effect's frames at 16x, its loop
as GIFs at 12x and 5x, and the five stills side by side.

## The reveal

When the last answer is picked, the result's icon builds itself pixel by
pixel in 0.7 s (`revealCells`): fire rises from its base, water fills from its
tip down, earth is laid from the ground up, air blows in from the left, and
aether's faintest pixels come first. It lands on one beat (see Motion), holds
0.8 s with its effect playing, and the result page opens. With reduced motion
it lands at once.

## Scenes

Each question has a little game screen above it: the situation the question
puts you in (`QUIZ_SCENES` in `lib/hackathon/elemental/quiz-scene-art.ts`,
drawn by `components/hackathon/elemental/quiz/QuestionScene.tsx`).

- 76x28, shown at 4 px a pixel on phones (304 x 112), 6 wider up, and 3 on
  small or short screens (under 800 px tall) so all five answers stay in
  view. Under 720 px tall it steps aside.
- Three planes, back to front: a flat **backdrop** (`night`, `room`, `dawn`
  or `smog`), a muted **far layer** (92 wide: stars, a skyline, classroom
  windows, the far bank), then the **scene**. The far layer drifts a pixel or
  two left and right, a whole pixel at a time, and on a computer it leans
  away from the mouse: the parallax. The page around it is flat.
- The scene is a still `base` plus 8 frames drawn over it in turn, looping
  for as long as the question is up: two to four things moving (the "..."
  typing, the lamp flickering, a blink, a fan, ripples, smog).
- **People are game sprites**, never faceless silhouettes: chibi proportions,
  a face, their own hairstyle, the Thai uniform (white shirt, navy shorts or
  skirt); the auntie in a pha sin with a fan. Drawn once on a character
  sheet, then placed. Skin `u U`, hair `h`, navy `n`, pha sin `b`.
- **Never steer.** A scene shows the situation, never an answer, and never an
  element's symbol: the warm light is a lamp, a screen, the sun.
- With motion off: the still, and nothing drifts.

Drawn by Codex and Gemini 4 Neon over four rounds from one brief and checker
each; the founder's notes along the way: more pixel density, more motion,
"the human isn't human", a flat background, parallax.

## Motion

The page moves by the same rules as the art: whole steps (`steps()` in
`components/hackathon/elemental/quiz/quiz.module.css`), never an ease or a fade.

| Moment | What happens |
|---|---|
| Pick an answer | It lights in flame and sits 2 px down; the others drop to 40%. 100 ms later the next question arrives in one step: 8 px off for 50 ms, then home. |
| Progress | The square just lit is 1.5x for one 90 ms frame. The square for the question you're on blinks like a cursor, four times, then holds. |
| Reveal, building | Three dots light at 175, 350 and 525 ms as the icon builds (700 ms), and a tick sounds for each row. |
| Reveal, landing | One beat: a 50 ms flash of the icon in its lightest light (flame white, lilac for aether, cream for the rest), the element's hit, its name, and the first hit of its sound. |
| Hits (`hit.ts`) | At the reveal's size: fire shakes 6, 4, 2 px over 100 ms; earth slams 12 px down, bounces 2 px up, home at 96 ms; water dips 4 px for 50 ms on its splash frame (210 ms); air is shoved 4 then 2 px right, home at 125 ms. Aether doesn't move: its pixels already flicker. |
| Effects | Each plays as many whole loops as fit in 5 s (at least two), then rests on its still. Motion that starts by itself stops by itself. |
| Tap an icon | The big icons on the intro and the result page play their sound and hit, and start their effect again. Every target is at least 48 px. |
| Result page | The crest drips in from the top edge, one of its eight rows every 60 ms. |

With reduced motion there is no flash, hit, pop, blink or drip, and the
reveal lands at once; the picked answer still lights.

## Sound

Every sound is played live in the browser from a short recipe in
`lib/hackathon/elemental/quiz-sfx.ts`. There are no sound files. The rules:

1. **Whole steps.** A voice jumps from note to note like an 8-bit pulse
   channel (pulse waves at 12.5%, 25% and 50%). Only things that really glide
   glide: the water drop and the wind.
2. **Nothing random.** Noise is seeded, so a crackle is the same crackle on
   every phone.
3. **One key.** Everything is in C major pentatonic, so sounds that overlap
   still agree.
4. **Quiet, and in order.** Element sounds sit at -18 to -20 dB (50 ms RMS),
   peaks under -8 dBFS. Taps sit about 5 dB under them.
5. **Phone speakers first.** Little below 300 Hz survives a phone speaker, so
   each sound's identity sits above it (earth's thud is a square wave, whose
   harmonics carry it).
6. **Never uninvited.** Nothing plays before the person's first tap, nothing
   loops, and the speaker toggle (on by default) is on every quiz screen and
   the result page. Turning it off cuts what is playing with a 12 ms fade. A
   new icon tap replaces the last one's sound instead of stacking. On iPhone
   the sound mixes with their music and stays quiet when the ring switch is
   on silent.
7. **Never in the way.** Sound can fail (an old browser, an interrupted
   audio session); the quiz carries on in silence. A sound asked for while
   the browser is still starting audio plays only if audio starts within
   120 ms, so late cues never pile up.

| Sound | Recipe |
|---|---|
| Start | C E G C up, 50 ms a note. |
| Pick | The question's note, then two steps up the scale, 22 ms each and softened. The eight picks climb C D E G A C D E, so you hear yourself getting closer. |
| Back | G down to C, softer and hollower. |
| Build | A thin tick for each row the icon builds (each column for air, each strength for aether), climbing from C4, landing with the pixels. |
| Fire | The first spark pops on the beat over a low catch rising; the pops get quieter as they cool; then G A D G up. |
| Earth | A crunch and a thud stepping down G, E, C (high enough for a phone to carry), then a pebble bouncing as the dust lands (410 and 615 ms), the second smaller. |
| Water | The drop (a rising plink), its splash on the frame the splash shows (210 ms), then the ripple stepping down from 420 ms. |
| Air | A gust that hits at once (full by 70 ms) and blows itself out, with a fifth riding on it. |
| Aether | Two triangles a hair apart climb E A E with two echoes (130 and 260 ms, no feedback, so it always ends), then the star glints as its lilac pixel appears (490 ms). |
| Share or copy | The two-note coin, G up to C. |

### Music

One song per page, in `lib/hackathon/elemental/quiz-music.ts`: chill lo-fi
chiptune loops, 8 bars each, all on the same four chords (C6/9, Am7, D7sus4,
G6sus4) voiced only in C major pentatonic, so every answer note and element
sound lands in tune on top.

| Page | Song |
|---|---|
| Intro | `title`: 72 BPM, sparse bells, pad and bass, no drums. Starts on the first icon tap. |
| Questions | `quiz`: 78 BPM. It builds as you go, like game music: pad and keys first, the bass from question 3, the drums from question 5. |
| Result | Its element's theme. Fire: 96 BPM, straight, driving pulse arpeggios. Water: 70 BPM, dreamy sine bells, long echoes. Earth: 84 BPM, steady square keys, a woody rim. Air: 90 BPM, light high arpeggios, hats. Aether: 64 BPM, floating bells two octaves up, no drums. |

- Every song's loudest moment sits about 6 dB under a pick (all seven within
  half a dB of each other). The bass and kick are kept low: a phone speaker
  can't play them, so the pad and keys carry it there.
- Songs crossfade (1.5 s in, 0.6 s out). The music steps out for the reveal;
  arriving on the result page from the quiz, its theme carries on, and a
  friend opening a shared link hears it after their first tap on the icon.
  Nothing starts by itself on a cold page load.
- It stops while the tab is hidden, and the speaker toggle stops it with
  everything else. The player keeps one bar scheduled ahead, and after a
  stall it skips ahead instead of cramming.

Each recipe takes any Web Audio context, so it can be rendered offline
(`OfflineAudioContext`) to listen to and measure. `quiz-sfx.test.ts` checks
the notes (every stepped note in key), the timing of the build against the
pixels, that every voice fades to silence before it is cut, and that every
element's sound, echoes included, ends within the reveal's 0.8 s hold.
`components/hackathon/elemental/quiz/__tests__/sound.test.ts` checks the
player: mute, the 12 ms cut, previews replacing each other, and failing safe.

A game-feel and chiptune review by Codex (2026-11-27) set most of these
numbers: the faster pick and landing, the one-beat landing, the earth and air
revoicing, the water splash timing, aether's bounded echo, and the 5 s loop limit.

## How the set was made (2026-11-26)

A first pass drew detailed 32x32 heroes. The founder preferred the old icons
("It should play on effects"), so the icons came back and the craft went into
the effects. Gemini 4 Neon (Antigravity), Codex and Claude each drew all five
effects from the same brief, checked with the script above. Shipped:

- **Fire, Neon:** sparks pop off the flame's tips and shoulders, drift up a
  pixel a frame and cool `w > c > l > f > e`; a tip flickers before each
  launch. 110 ms a frame.
- **Earth, Neon:** a crack opens on the right shoulder, a pebble breaks off,
  lands and throws dust, and a crumb falls at the other foot. 205 ms.
- **Water, Neon:** a toxic drip gathers under the drop, falls, splashes and
  spreads a ripple. 210 ms.
- **Air, Codex:** gusts blow in on the left and out on the right, and a wisp
  curls over the top. 140 ms.
- **Aether, Neon:** pixels blink out and come back in turn, and a soft star
  glints in the corner. 245 ms.
- **Crests:** Neon, with cream moved off row 0 on earth, water and air (at
  36 px it read as white teeth along the top edge).
