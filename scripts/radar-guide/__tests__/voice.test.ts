/**
 * @jest-environment node
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildStoryTimeline,
  hostMoodAt,
  phaseAt,
} from "../../../components/radar/reel/story/storyTimeline";
import { STORY_SCRIPTS } from "../../../lib/radar-stories";
import { beatMs, STORY_FPS, toFrames } from "../../../lib/radar-stories/timing";
import { VOICE_BEAT_TAIL_MS } from "../../../lib/radar-stories/voice";
import { encodeWav16Mono, parseWav, SCORER_SAMPLE_RATE } from "../../../lib/radar-stories/wav";
import {
  buildStoryVoiceWav,
  loadStoryVoiceClips,
  parseLoudnormStats,
  voiceAnalyzeArgs,
  voiceDurationsFromClips,
  voiceProcessArgs,
} from "../lib/voice";

describe("story timeline with voice takes", () => {
  const script = STORY_SCRIPTS.find((s) => s.id === "round1-00-portfolio")!;
  const hostBeatIndices = script.beats
    .map((b, i) => (b.who === "host" ? i : -1))
    .filter((i) => i >= 0);

  it("matches the silent timeline identically when no voice durations are passed", () => {
    const baseline = buildStoryTimeline(script);
    const withEmpty = buildStoryTimeline(script, script.hookTh, {});
    expect(withEmpty).toEqual(baseline);
    for (const b of baseline.beats) {
      expect(b.voiceF).toBeUndefined();
    }
  });

  it("extends voiced beats to at least voice duration + 400 ms and shifts following beats", () => {
    const base = buildStoryTimeline(script);
    const longBeatIdx = hostBeatIndices[0]; // mood: "wow"
    const shortBeatIdx = hostBeatIndices[1]; // mood: "talk"
    const longVoiceMs = 4600; // longer than default beat (~3000 ms)
    const shortVoiceMs = 1200; // shorter than default beat

    const voiced = buildStoryTimeline(script, script.hookTh, {
      voiceDurationsMs: {
        [longBeatIdx]: longVoiceMs,
        [shortBeatIdx]: shortVoiceMs,
      },
    });

    const expectedLongF = toFrames(Math.max(beatMs(script.beats[longBeatIdx]), longVoiceMs + VOICE_BEAT_TAIL_MS));
    expect(voiced.beats[longBeatIdx].endF - voiced.beats[longBeatIdx].startF).toBe(expectedLongF);
    expect(voiced.beats[longBeatIdx].voiceF).toBe(toFrames(longVoiceMs));
    expect(voiced.beats[longBeatIdx].talkF).toBeGreaterThanOrEqual(toFrames(longVoiceMs));

    // Short voice does not shrink the beat
    expect(voiced.beats[shortBeatIdx].endF - voiced.beats[shortBeatIdx].startF).toBe(
      base.beats[shortBeatIdx].endF - base.beats[shortBeatIdx].startF,
    );
    expect(voiced.beats[shortBeatIdx].voiceF).toBe(toFrames(shortVoiceMs));

    // Every beat after the extended one shifts forward by the exact delta
    const deltaF = expectedLongF - (base.beats[longBeatIdx].endF - base.beats[longBeatIdx].startF);
    expect(deltaF).toBeGreaterThan(0);
    expect(voiced.beats[longBeatIdx + 1].startF).toBe(base.beats[longBeatIdx + 1].startF + deltaF);
    expect(voiced.end.startF).toBe(base.end.startF + deltaF);
    expect(voiced.totalF).toBe(base.totalF + deltaF);
  });

  it("keeps P'Seed in talk mood while his voice plays, then restores his scripted mood on the tail", () => {
    const winkBeatIdx = script.beats.findIndex((b) => b.who === "host" && b.mood === "wink");
    expect(winkBeatIdx).toBeGreaterThanOrEqual(0);

    // Without voice, the beat stays in its scripted wink mood from frame 0 of the beat.
    const silent = buildStoryTimeline(script);
    const silentCue = silent.beats[winkBeatIdx];
    expect(hostMoodAt(phaseAt(silent, silentCue.startF), silentCue.startF)).toBe("wink");

    // With voice, P'Seed stays in "talk" for the full voice duration, then lands on "wink" in the 0.4 s tail.
    const voiced = buildStoryTimeline(script, script.hookTh, {
      voiceDurationsMs: { [winkBeatIdx]: 4500 },
    });
    const cue = voiced.beats[winkBeatIdx];
    expect(cue.voiceF).toBe(toFrames(4500));

    // First frame and last voice frame: talk mood
    expect(hostMoodAt(phaseAt(voiced, cue.startF), cue.startF)).toBe("talk");
    const lastVoiceF = cue.startF + cue.voiceF! - 1;
    expect(hostMoodAt(phaseAt(voiced, lastVoiceF), lastVoiceF)).toBe("talk");
    expect(lastVoiceF).toBeLessThan(cue.startF + cue.talkF);

    // Tail after voice finishes: scripted mood ("wink")
    const tailF = cue.startF + cue.voiceF!;
    expect(tailF).toBeLessThan(cue.endF);
    expect(hostMoodAt(phaseAt(voiced, tailF), tailF)).toBe("wink");

    // End card stays wink
    expect(hostMoodAt(phaseAt(voiced, voiced.end.startF), voiced.end.startF)).toBe("wink");
  });
});

describe("voice track placement and local clip discovery", () => {
  const script = STORY_SCRIPTS.find((s) => s.id === "lost-00-midnight")!;
  const hostIndices = script.beats
    .map((b, i) => (b.who === "host" ? i : -1))
    .filter((i) => i >= 0);

  it("discovers <beat>.wav files on disk and places them at each beat's start time in 44.1 kHz voice.wav", () => {
    const tmp = mkdtempSync(join(tmpdir(), "radar-voice-test-"));
    try {
      const storyDir = join(tmp, script.id);
      mkdirSync(storyDir, { recursive: true });

      const b0 = hostIndices[0];
      const b1 = hostIndices[1];
      const samples0 = new Float32Array(Math.round(1.5 * SCORER_SAMPLE_RATE)).fill(0.4);
      const samples1 = new Float32Array(Math.round(3.8 * SCORER_SAMPLE_RATE)).fill(-0.35);

      writeFileSync(join(storyDir, `${b0}.wav`), encodeWav16Mono(samples0, SCORER_SAMPLE_RATE));
      writeFileSync(join(storyDir, `${b1}.wav`), encodeWav16Mono(samples1, SCORER_SAMPLE_RATE));
      // Unrelated files are ignored
      writeFileSync(join(storyDir, "manifest.json"), "{}");

      const clips = loadStoryVoiceClips(tmp, script);
      expect(clips.map((c) => c.beatIndex)).toEqual([b0, b1]);
      expect(clips[0].durationMs).toBe(1500);
      expect(clips[1].durationMs).toBe(3800);

      const durations = voiceDurationsFromClips(clips);
      const timeline = buildStoryTimeline(script, script.hookTh, { voiceDurationsMs: durations });

      const voiceWavBytes = buildStoryVoiceWav(timeline, clips);
      const parsed = parseWav(voiceWavBytes);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;

      expect(parsed.wav.sampleRate).toBe(SCORER_SAMPLE_RATE);
      expect(parsed.wav.channels).toBe(1);
      expect(parsed.wav.bitsPerSample).toBe(16);

      // Before beat b0 starts: silent
      const b0StartSample = Math.round((timeline.beats[b0].startF / STORY_FPS) * SCORER_SAMPLE_RATE);
      expect(parsed.wav.samples[Math.max(0, b0StartSample - 200)]).toBe(0);
      // Inside beat b0: ~+0.4
      expect(parsed.wav.samples[b0StartSample + 2000]).toBeCloseTo(0.4, 3);

      // Inside beat b1: ~-0.35
      const b1StartSample = Math.round((timeline.beats[b1].startF / STORY_FPS) * SCORER_SAMPLE_RATE);
      expect(parsed.wav.samples[b1StartSample - 200]).toBe(0);
      expect(parsed.wav.samples[b1StartSample + 2000]).toBeCloseTo(-0.35, 3);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("ffmpeg voice processing args", () => {
  it("builds pass-1 analysis and two-pass loudnorm filter chain to 44.1 kHz mono WAV", () => {
    const analyze = voiceAnalyzeArgs("/tmp/in.wav");
    const afAnalyze = analyze[analyze.indexOf("-af") + 1];
    expect(afAnalyze).toContain("highpass=f=80");
    expect(afAnalyze).toContain("afftdn=");
    expect(afAnalyze).toContain("deesser=");
    expect(afAnalyze).toContain("acompressor=");
    expect(afAnalyze).toContain("loudnorm=I=-16");
    expect(afAnalyze).toContain("print_format=json");

    const sampleStderr = `
[Parsed_loudnorm_4 @ 0x1]
{
  "input_i" : "-21.40",
  "input_tp" : "-3.20",
  "input_lra" : "6.50",
  "input_thresh" : "-31.80",
  "target_offset" : "0.45"
}`;
    const stats = parseLoudnormStats(sampleStderr);
    expect(stats).toEqual({
      inputI: -21.4,
      inputTp: -3.2,
      inputLra: 6.5,
      inputThresh: -31.8,
      targetOffset: 0.45,
    });

    const twoPass = voiceProcessArgs("/tmp/in.wav", "/tmp/out.wav", stats);
    const afTwoPass = twoPass[twoPass.indexOf("-af") + 1];
    expect(afTwoPass).toContain("measured_I=-21.4");
    expect(afTwoPass).toContain("linear=true");
    expect(twoPass).toContain("-ac");
    expect(twoPass[twoPass.indexOf("-ac") + 1]).toBe("1");
    expect(twoPass[twoPass.indexOf("-ar") + 1]).toBe("44100");
    expect(twoPass[twoPass.indexOf("-c:a") + 1]).toBe("pcm_s16le");

    // Rejects -inf silence stats and falls back cleanly to single-pass loudnorm
    expect(parseLoudnormStats('{ "input_i": "-inf", "input_tp": "-inf", "input_lra": "0", "input_thresh": "-inf", "target_offset": "inf" }')).toBeNull();
    const fallback = voiceProcessArgs("/tmp/in.wav", "/tmp/out.wav", null);
    expect(fallback[fallback.indexOf("-af") + 1]).not.toContain("linear=true");
  });
});
