# Radar Guide media pipeline

How a code-authored Career Radar guide gets its founder cutscenes, captions,
art and reels. Guides are TypeScript in `lib/radar-guides/<slug>/`; nothing
about a guide's pages is stored in the database. Architecture:
[`docs/features/radar-guides-in-code.md`](../features/radar-guides-in-code.md)
(section 3 is this pipeline). The cybersecurity design:
[`cybersecurity-guide.md`](cybersecurity-guide.md).

Careers without a code guide still use the DB deck at `/radar/<slug>`; only
`radar:dump`, `radar:cover` and the motion reel's card fallback touch them.

## The guide as a game run

Each guide is a run through levels. A level is one page file
(`lib/radar-guides/<slug>/pages/<key>.ts`): a pixel scene, a story beat in
dialogue boxes, facts as in-world items with their source chip, and usually a
game. Key levels have a **cutscene**: the founder's vertical short, described
by the page's `clip` slot (`ClipSlot`).

- The slot's `scriptLinesTh` is the script. The teleprompter reads it, and
  `radar:clip` uses it as the caption text.
- Until a take is recorded, the cutscene falls back to the host NPC saying the
  same lines in dialogue boxes, so every level is complete without video.
- The host's display name is `GUIDE_HOST` in `lib/radar-guide/story.ts`.

## What lives where

| Thing | Where | Public? |
|---|---|---|
| Pages, copy, facts, clip slots, reel plans, demo scripts | `lib/radar-guides/<slug>/` | Yes, reviewed in a PR |
| Recorded cutscenes (URLs, sha8, duration, script hash) | `lib/radar-guides/<slug>/clips.json` | Yes, written by `radar:clip` |
| Captions | `lib/radar-guides/<slug>/clips/<page>.vtt` | Yes, written by `radar:clip`, editable in a PR |
| mytcas snapshot | `lib/radar-guides/<slug>/tcas.json` | Yes, written by `radar:tcas` |
| Scene art, host sprite | `public/radar/guides/<slug>/`, `public/radar/guides/host/` | Yes, written by `radar:art` |
| Research notes | `docs/radar-guide/factsheets/`, `docs/radar-guide/news/` | Yes (facts are ported into `facts.ts`) |
| Pipeline code | `scripts/radar-guide/`, `lib/radar-guide/caption-align.ts`, `components/radar/reel/` | Yes |
| Web clips, posters | B2 behind `cdn.passionseed.org` | Yes (immutable, content-hashed keys) |
| Dumps of a DB field | `.cache/radar-guide/<slug>.json` | Gitignored |
| Raw footage, clean masters, cut lists, Dusk City edits, reels | `~/Movies/radar-guide/<slug>/` or Drive | Never in the repo |

Never commit `.env*`, student data, or IG comment text. A cutscene appears on
the page only after the PR with `clips.json` and the VTT merges and the
preview has been checked: that merge is the publish gate.

## Commands

Every command exits with a clear message when an env var or a binary it needs
is missing, and checks before it starts encoding. Commands that upload have a
`--dry-run` that uploads nothing and leaves the repo unchanged.

| Command | Needs | Does |
|---|---|---|
| `pnpm radar:check [slug] [--max-age 45] [--db]` | nothing (`--db`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | guide-lint over every guide, plus `clips.json` against the pages (stale script hashes, broken VTT), a required cutscene missing on a `live` guide, and every demo reel (steps ascend, 8 to 45 seconds). `--max-age N` makes pages older than N days an error. `--db` checks each slug is a published `radar_fields` row (read only). Writes nothing. For `--db`, load the env first: `pnpm exec dotenv -e .env.local -- pnpm radar:check --db`. |
| `pnpm radar:clip <slug> <page> <take.mov>` | ffmpeg, ffprobe, `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_NAME`; whisper-cli optional | Fails if the page has no `clip` slot or its script fails guide-lint. Tone-maps iPhone HLG to SDR, writes the clean 1080x1920 master, the 540x960 web clip (about 1.2 Mbps, faststart), a webp poster under 60KB, captions (whisper times, our script text) and the cut list. Uploads clip and poster to `radar/guide/<slug>/<page>.<sha8>.{mp4,webp}`, then writes `clips/<page>.vtt` and `clips.json` (sorted, 2-space JSON). No database. `--dry-run` skips B2 and writes the would-be `clips.json` and VTT to `<out>/dry-run/`, with copies of the web clip and poster. `--no-whisper`, `--out dir`, `--allow-lint-errors`. |
| `pnpm radar:reel <slug>` | the studio server, ffmpeg, python3 + numpy (unless `--no-audio`), Playwright | Films reels into `~/Movies/radar-guide/<slug>/`. Motion (default): the Dusk City scene reel, "อาชีพนี้ใน 30 วินาที", built from the guide's fact-backed lines (dump cards are a fallback). `--page key` makes a one-level reel, `--compare other-slug` "เทียบ 2 อาชีพ", `--cover` saves the cover frame. `--format demo --page key` films the level itself being played (below). `--platform tt` swaps the end card. `--dry-run` writes the payload or plan and prints the timeline: no browser, no ffmpeg. Nothing is uploaded. |
| `pnpm radar:art <slug>` | nothing (`--source agy`: the `agy` CLI) | Scene art for every level, the level map, the profile card frame and the host sprite, as webp of at most 120KB. Hand-made pixel art by default; `--source agy` asks Antigravity's image tool (normal permission prompts). No people, no text, no logos. `--dry-run`. |
| `pnpm radar:tcas <slug>` | network (local only) | Refreshes `tcas.json` from mytcas. Review the diff in a PR; the build never fetches it. |
| `pnpm radar:dump <slug>` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | DB deck careers: reads the published field, cards, sources, skills and start options with the anon key into `.cache/radar-guide/<slug>.json`. Fails on dashes in visible card copy. `--fixture` reads `lib/radar-guide/__fixtures__/<slug>.json` instead (offline). |
| `pnpm radar:cover <slug> <scene>` | agy, ffprobe, B2 env | DB deck careers: one 1024x1024 background through agy (scenery only), uploaded to `radar/art/<slug>/<scene>.<sha8>.png`. `--dry-run` prints the prompt and the command. |

### Captions without whisper

`radar:clip` times captions with `whisper-cli` (Thai, model
`~/.cache/whisper/ggml-large-v3-turbo-q5_0.bin`) and keeps the script's text
(`alignScriptToCues`). If whisper-cli or the model is missing, or whisper's
transcript does not resemble the script, it says so and spreads the lines over
the clip in proportion to their spoken length. Check those captions by eye
before opening the PR. `--no-whisper` forces the fallback.

Install whisper once: `brew install whisper-cpp`, then download the model into
`~/.cache/whisper/`.

## Recording a cutscene

1. Open the teleprompter on the phone that films, or on a second screen:
   `/admin/radar/guide/<slug>/teleprompter` (admin only). It lists every
   cutscene in recording order (required, then safety, then level order),
   with its status from `clips.json`: missing, recorded, or "script changed:
   re-record".
   - Big text, one line per tap: tap the right of the screen for the next
     line, the left to go back. On a keyboard, Space and Shift+Space.
   - The mirror button (or M) flips the text for a beam-splitter rig. A- and
     A+ change the size. The scroll mode auto-scrolls at a chosen speed.
   - The on-screen hook shows as a grey cue on the first line; it is never
     read aloud. Safety lines are marked: keep your face on screen for them.
   - Founder reel hooks come after the script, as separate takes.
   - `?all=1` is the clip slate: every script on one page for printing.
2. Record 9:16 (an iPhone is fine). One take per cutscene. For
   cybersecurity, every level about testing systems keeps its safety line
   ("ได้รับอนุญาต") with your face on screen.
3. `pnpm radar:clip <slug> <page> ~/Movies/take.mov --dry-run` and check the
   captions and the poster in `~/Movies/radar-guide/<slug>/`.
4. `pnpm radar:clip <slug> <page> ~/Movies/take.mov` uploads and writes
   `lib/radar-guides/<slug>/clips.json` and `clips/<page>.vtt`.
5. Commit those two files in a PR and check the cutscene on the Vercel
   preview (tap to play with sound, captions, skip).
6. Edit the social master from `~/Movies/radar-guide/<slug>/<page>.master.mp4`
   with `<page>.cuts.json`, in the Dusk City style (company-brain
   `reels-style.md`). Our pipeline never burns captions into social videos.

If you change a script after recording, `radar:check` reports the clip as
stale and the teleprompter says "re-record". The old clip keeps playing until
a new take replaces it.

## Reels

Each page's `reel` plan (`format`, hook, two variants, send-to-friend line,
shot list) says which kind of reel the level makes.

**Motion** (`format: "motion"`, or any level with `radar:reel --page`).
`app/studio/radar-reel/[slug]` is render only: it reads
`window.__RADAR_REEL__`, never Supabase, and is not served in production.
`radar:reel` builds the payload from the guide (only numbers a cited,
confirmed fact backs; pending and simulated facts are left out), injects it
with Playwright and films it frame by frame like the SHIFT reels. The timeline
lives in `components/radar/reel/radarReel.ts`; the same times drive the
animation and the soundtrack (`scripts/shift-reel-audio.py`).

**Demo** (`format: "demo"`). `app/studio/radar-guide/[slug]/[page]` renders
the real level in demo mode (no tracking, no storage, every step revealed)
inside a 432x768 frame, between a hook card (`reel.hook`) and the end card.
`radar:reel <slug> --page <key> --format demo` films it at
deviceScaleFactor 2.5 (1080x1920) under Chrome virtual time, so the level's
timers and animations land on the same frame every run.

- The level's own `DemoPlayer` plays its blocks' `demoScript` steps. The
  frame follows it like a camera: it scrolls each target into view, draws a
  fingertip on each tap, and reports steps whose `[data-demo]` target is
  missing.
- Without `?render=1` the studio page plays on its own and shows the
  Instagram safe zones, for checking a plan before filming.
- If virtual time stalls, the command says so; re-run with `--realtime`
  (Playwright's real-time video).

Start the studio server first: `scripts/studio-server.sh` (port 3010; it
restarts any server already on that port), or point `--base` at another dev
server.

## Caption templates

Reels are planned per level. A level can feed several reels (the main one
plus Trial Reels with the hook variants) or none. Fill the templates from the
page's `reel` plan.

**Instagram**

```
{hook}
อยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM
{sendToFriendTh}

#CareerRadar #เลือกคณะ #TCAS #{career hashtag}
```

No "follow us" ask. Pin "คอมเมนต์ RADAR รับลิงก์ข้อมูลเต็มทาง DM" as the first
comment. The DM link goes to the level the reel is about
(`/r/<alias>-<page>-<code>`).

**TikTok**

```
{hook}
ข้อมูลเต็ม พิมพ์ passionseed.org/r/{alias}-{page}
```

TikTok has no comment-to-DM flow and we assume no bio link: the typeable
alias is the only way in (`cyber`, `ai`, `data`, `dev`, optionally with a page
key, such as `cyber-terminal`).

Copy rules for both: no em or en dashes, never "น้องๆ", no weekly release day,
no price. The program line on the guide's last level is the SHIFT open round
from `lib/content/shift-cohort.ts`.

## Cost tiers from career #5

| Tier | Gets | Founder time |
|---|---|---|
| Deck | Research and the interactive DB deck, the 30-second motion reel | 0 |
| Guide | A code guide (levels, games, host dialogue), motion and demo reels | 0 on camera |
| Guide with cutscenes | The guide plus founder cutscenes on its required levels | the minutes on camera the clip slate (`?all=1`) shows, plus retakes |

A career moves up a tier only on demand (career requests, keyword comments
per 1k reach).

## Refreshing the test fixtures

`lib/radar-guide/__fixtures__/` holds dumps of the four pilot careers' DB
decks. After the content sweep removes the dashes, refresh each one
(`pnpm radar:dump <slug>` and copy `.cache/radar-guide/<slug>.json` over the
fixture), then remove the slug from `AWAITING_SWEEP` in
`lib/radar-guide/__tests__/card-copy.test.ts`. That test is marked
`it.failing` until then, and turns red as soon as a refreshed fixture is clean
so the check cannot be forgotten.
