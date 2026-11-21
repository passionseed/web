# Elemental Hackathon voice kit

Everything a voice needs to film their 60-second video for the Elemental Hackathon: the brief, green-screen backgrounds of their element's place falling apart behind them, and the ending clip. A voice is the adult who talks about one element's problem for the hackathon. Every file is served from `passionseed.org/hackathon/elemental/voice-kit/`, so a voice can be sent links instead of attachments.

## Files

| File | What it is |
|---|---|
| `brief-th.md` | The one-page brief in Thai: what the hackathon is, what we ask, the rules, a 60-second structure with example hooks, three talking points per element, how to film, how to use the backgrounds, and how to post |
| `backgrounds/earth.mp4` | Rice terraces in mist; an e-waste heap grows and the terraces die. 11 s |
| `backgrounds/water.mp4` | A river valley; pipes pour in until the river runs toxic green. 11 s |
| `backgrounds/air.mp4` | A green valley; factories go up and smoke fills it. 11 s |
| `backgrounds/fire.mp4` | A mountain meadow; a grass fire spreads. 11 s |
| `backgrounds/aether.mp4` | A rice field under a pylon; a data center goes up and the field dries out. 11 s |
| `backgrounds/poster-scene.mp4` | The key visual's valley with its fire, smog and toxic water, no type, a seamless loop. 12 s |
| `ending.mp4` | The last 4.5 s of every voice video: the poster, clean, catching fire, then black. With sound |

The backgrounds are 1080x1920, H.264, with no sound and no words, so the voice is the only thing you hear and read. Each place starts clean, starts to break at about 1.5 s and is fully wrecked by about 10 s, so it fits behind the hook.

## Before a brief goes to anyone

The brief is a draft. Every message to a voice needs a go from Big or Angpao first, and these lines are still `(fill in)` in `brief-th.md`:

- The written permission form for using the video.
- Where a voice sends the raw file, and who edits it.
- The deadline.
- Who the voice contacts on our team.

Also still open: whether voices are paid, and where the videos appear (Instagram collab posts, the challenge pages on the web, the starter pack).

The rules in the brief come from the hackathon plan: adults only, we never name or accuse a company, students and adults only talk in staff-run group rooms, and we contact voices through their public business channels. The talking points follow the five challenge briefs, as questions the voice answers in their own words, so the video carries their facts, not ours. The facts about the event (dates, online on Discord, prize total, prices, sign-up link) come from `components/hackathon/poster/elemental/facts.ts`; if one changes, change the brief too.

## How they were made

- Backgrounds: the 1080x1350 renders of the five place videos (the same ones as `public/hackathon/elemental/media/elements/`, which are 720 px web copies), scaled to 1920 high and cropped to 1080 wide on the action, sound removed:

      ffmpeg -i elemental-<element>.mp4 -vf "scale=1536:1920:flags=lanczos,crop=1080:1920:<x>:0" -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p -an -movflags +faststart <element>.mp4

  `<x>` is 228 for earth, air and fire, 205 for water and 250 for aether. `poster-scene.mp4` is `media/key-visual-scene-loop.mp4` looped four times and cropped the same way at 300.
- Ending: the last 4.5 s of the 9:16 rewind teaser, from `scripts/render-elemental-teaser.py --cut rewind --aspect 9:16 --hook <dir>`.

Credits for the photos and sounds: `public/hackathon/elemental/media/README.md`.
