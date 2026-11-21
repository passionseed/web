import fs from "node:fs";

/**
 * Container health for the Elemental bot. Every 60 seconds the module reads
 * each guild's settings (elemental_bot_settings_get, which also refreshes the
 * settings cache) and, only when every read reached the database and the
 * gateway is connected, touches the image's health file. Docker's HEALTHCHECK
 * reads its age (bot/Dockerfile) and bot/watchdog.py alerts on it, so a bot
 * that lost its database or its gateway turns unhealthy within 3 minutes.
 *
 * Same file as shift-voice: the image is shared, only one module set runs per
 * container, and elemental never runs beside shift-voice (env.ts).
 */
export const HEALTH_FILE = "/tmp/shift-voice-healthy";
export const BEAT_MS = 60_000;

export interface HeartbeatOptions {
  /** One database round trip; resolves on success, throws on failure. */
  ping: () => Promise<void>;
  /** Gateway state; a beat while disconnected does not count as healthy. */
  connected?: () => boolean;
  healthFile?: string;
  intervalMs?: number;
  /** Wall clock for the file's content; tests pass a fake. */
  now?: () => Date;
}

export interface Heartbeat {
  /** One beat now. Resolves true when the health file was touched. */
  beat(): Promise<boolean>;
  stop(): Promise<void>;
}

export function touchHealthFile(file: string, at: Date): boolean {
  try {
    // writeFileSync then utimesSync: the mtime is what Docker reads, and an
    // explicit time keeps it moving even when two beats share a millisecond.
    fs.writeFileSync(file, at.toISOString());
    fs.utimesSync(file, at, at);
    return true;
  } catch (error) {
    console.error("[elemental] could not write health file:", (error as Error).message);
    return false;
  }
}

/** Starts beating at once and every intervalMs. Never throws: a failed beat is only logged. */
export function startHeartbeat(opts: HeartbeatOptions): Heartbeat {
  const file = opts.healthFile ?? HEALTH_FILE;
  const now = opts.now ?? (() => new Date());
  let running: Promise<boolean> | null = null;
  let stopped = false;
  let failures = 0;

  async function once(): Promise<boolean> {
    try {
      await opts.ping();
    } catch (error) {
      failures += 1;
      // Log the first failure and then every tenth, so an outage is visible but not a flood.
      if (failures === 1 || failures % 10 === 0) {
        console.error(`[elemental] heartbeat failed (${failures} in a row): ${(error as Error)?.name ?? "error"}`);
      }
      return false;
    }
    if (failures > 0) console.log(`[elemental] heartbeat back after ${failures} failure(s)`);
    failures = 0;
    if (opts.connected && !opts.connected()) return false;
    return touchHealthFile(file, now());
  }

  function beat(): Promise<boolean> {
    if (stopped) return Promise.resolve(false);
    // A slow database must not stack beats on top of each other.
    if (!running) running = once().finally(() => (running = null));
    return running;
  }

  void beat();
  const timer = setInterval(() => void beat(), opts.intervalMs ?? BEAT_MS);
  timer.unref?.();

  return {
    beat,
    async stop() {
      stopped = true;
      clearInterval(timer);
      await running?.catch(() => undefined);
    },
  };
}
