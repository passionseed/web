/**
 * Shared CLI plumbing for the radar-guide commands: argument parsing, clear
 * failures for missing env vars and binaries, and the repo's paths.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

import { RADAR_SLUG_PATTERN } from "../../../lib/radar-guide/types";

/** Thrown for user-facing errors; `main()` prints the message and exits 1. */
export class CliError extends Error {}

export function fail(message: string): never {
  throw new CliError(message);
}

/** Runs a command's main, printing CliErrors without a stack trace. */
export function runMain(main: () => Promise<void>): void {
  main().catch((err: unknown) => {
    if (err instanceof CliError) {
      console.error(`\nError: ${err.message}`);
    } else {
      console.error(err);
    }
    process.exit(1);
  });
}

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

export interface ParsedArgs {
  positional: string[];
  flags: Record<string, string | true>;
}

/**
 * `--flag`, `--flag=value` and `--flag value` (the last only for names listed
 * in `valueFlags`). Unknown flags are an error so typos do not silently run a
 * real upload.
 */
export function parseArgs(argv: string[], known: { bool?: string[]; value?: string[] }): ParsedArgs {
  const bool = new Set(known.bool ?? []);
  const value = new Set(known.value ?? []);
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const eq = arg.indexOf("=");
    const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
    const inline = eq === -1 ? undefined : arg.slice(eq + 1);
    if (bool.has(name)) {
      if (inline !== undefined) fail(`--${name} takes no value.`);
      flags[name] = true;
    } else if (value.has(name)) {
      const v = inline ?? argv[++i];
      if (v === undefined || v.startsWith("--")) fail(`--${name} needs a value.`);
      flags[name] = v;
    } else {
      fail(`Unknown flag --${name}.`);
    }
  }
  return { positional, flags };
}

export function flagString(args: ParsedArgs, name: string): string | undefined {
  const v = args.flags[name];
  return typeof v === "string" ? v : undefined;
}

export function assertSlug(slug: string | undefined, usage: string): string {
  if (!slug) fail(`Missing <slug>.\nUsage: ${usage}`);
  if (!RADAR_SLUG_PATTERN.test(slug)) fail(`"${slug}" is not a valid radar slug (lowercase letters, digits and hyphens).`);
  return slug;
}

// ---------------------------------------------------------------------------
// Env and binaries
// ---------------------------------------------------------------------------

/** Returns the values, or fails naming every missing variable at once. */
export function requireEnv<K extends string>(names: readonly K[], why: string): Record<K, string> {
  const missing = names.filter((name) => !process.env[name]?.trim());
  if (missing.length) {
    fail(
      `Missing environment variable${missing.length > 1 ? "s" : ""} ${missing.join(", ")} (${why}).\n` +
        "Set them in .env.local; the pnpm script loads it with dotenv."
    );
  }
  return Object.fromEntries(names.map((name) => [name, process.env[name]!.trim()])) as Record<K, string>;
}

export function hasBinary(name: string): boolean {
  const result = spawnSync("/bin/sh", ["-c", `command -v "$1"`, "sh", name], { encoding: "utf8" });
  return result.status === 0 && result.stdout.trim().length > 0;
}

export const INSTALL_HINTS: Record<string, string> = {
  ffmpeg: "brew install ffmpeg",
  ffprobe: "brew install ffmpeg (ffprobe ships with it)",
  "whisper-cli": "brew install whisper-cpp, then download ggml-large-v3-turbo-q5_0.bin to ~/.cache/whisper/",
  agy: "install the Antigravity CLI and sign in once interactively",
  python3: "brew install python, then pip3 install numpy",
};

export function requireBinary(name: string, why: string): void {
  if (!hasBinary(name)) {
    const hint = INSTALL_HINTS[name] ? ` Install: ${INSTALL_HINTS[name]}.` : "";
    fail(`"${name}" is not on PATH (${why}).${hint}`);
  }
}

/** Runs a command, inheriting stderr; rejects with the exit code. */
export function run(
  cmd: string,
  args: string[],
  options: { stdin?: (stream: NodeJS.WritableStream) => void | Promise<void>; quiet?: boolean } = {}
): Promise<void> {
  return new Promise((ok, reject) => {
    const child = spawn(cmd, args, {
      stdio: [options.stdin ? "pipe" : "ignore", "ignore", options.quiet ? "ignore" : "inherit"],
    });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? ok() : reject(new CliError(`${cmd} exited with code ${code}.`))));
    if (options.stdin && child.stdin) {
      Promise.resolve(options.stdin(child.stdin)).catch(reject);
    }
  });
}

/** Runs a command and returns stdout. */
export function capture(cmd: string, args: string[]): string {
  const result = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.error) fail(`${cmd} failed to start: ${result.error.message}`);
  if (result.status !== 0) fail(`${cmd} exited with code ${result.status}: ${result.stderr.trim().slice(0, 800)}`);
  return result.stdout;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export const REPO_ROOT = resolve(__dirname, "../../..");

export const paths = {
  cacheDir: join(REPO_ROOT, ".cache/radar-guide"),
  dump: (slug: string) => join(REPO_ROOT, ".cache/radar-guide", `${slug}.json`),
  artIndex: join(REPO_ROOT, "docs/radar-guide/art.json"),
  fixture: (slug: string) => join(REPO_ROOT, "lib/radar-guide/__fixtures__", `${slug}.json`),
  /** Masters, VTTs and cut lists stay on the founder's machine. */
  movies: (slug: string) => join(homedir(), "Movies/radar-guide", slug),
  whisperModel: join(homedir(), ".cache/whisper/ggml-large-v3-turbo-q5_0.bin"),
};

export function requireFile(path: string, hint: string): void {
  if (!existsSync(path)) fail(`${path} does not exist. ${hint}`);
}

/** Today in Bangkok, YYYY-MM-DD. */
export function todayBangkok(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}
