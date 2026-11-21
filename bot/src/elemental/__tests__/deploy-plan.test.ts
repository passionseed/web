/**
 * @jest-environment node
 */
// bot/deploy.sh and bot/watchdog.py take the container name and folder as
// parameters whose defaults are today's container, byte for byte. Every run
// here uses a fake `ssh` (and a fake `docker` for the watchdog) on PATH, so
// nothing leaves this machine.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../../..");
const DEPLOY = path.join(ROOT, "bot/deploy.sh");
const WATCHDOG = path.join(ROOT, "bot/watchdog.py");
const ELEMENTAL = "passionseed-discord-bot-elemental";

let tmp: string;
let bin: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deploy-plan-"));
  bin = path.join(tmp, "bin");
  fs.mkdirSync(bin);
  // Records its arguments and the remote script it would have run.
  fs.writeFileSync(
    path.join(bin, "ssh"),
    '#!/usr/bin/env bash\necho "$*" >> "$FAKE_DIR/ssh.args"\ncat > "$FAKE_DIR/ssh.stdin"\nexit 0\n',
    { mode: 0o755 },
  );
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

/** A clean environment: no BOT_* from the developer's shell. */
type Env = Record<string, string | undefined>;

function env(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const base: Env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (!k.startsWith("BOT_")) base[k] = v;
  }
  const out: Env = { ...base, PATH: `${bin}:${process.env.PATH}`, FAKE_DIR: tmp, COLUMNS: "200", ...extra };
  return out as NodeJS.ProcessEnv;
}

function deploy(args: string[], extra: Record<string, string> = {}, input = "") {
  const r = spawnSync("bash", [DEPLOY, ...args], { cwd: ROOT, env: env(extra), input, encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

const sshCalled = () => fs.existsSync(path.join(tmp, "ssh.args"));

/** Runs the variable lines the deploy puts ahead of every remote script, with a fake $HOME. */
function remoteVars(): { APP: string; ENV_FILE: string; NAME: string; RERUN: string; rest: string } {
  const script = fs.readFileSync(path.join(tmp, "ssh.stdin"), "utf8");
  const lines = script.split("\n");
  const head = lines.slice(0, lines.indexOf("set -euo pipefail"));
  const r = spawnSync(
    "bash",
    ["-c", `${head.join("\n")}\nprintf '%s|%s|%s|%s' "$APP" "$ENV_FILE" "$NAME" "$RERUN"`],
    { env: { PATH: process.env.PATH, HOME: "/srv/h" } as Env as NodeJS.ProcessEnv, encoding: "utf8" },
  );
  const [APP, ENV_FILE, NAME, RERUN] = r.stdout.split("|");
  return { APP, ENV_FILE, NAME, RERUN, rest: lines.slice(head.length).join("\n") };
}

describe("bot/deploy.sh --print-plan", () => {
  test("is valid bash", () => {
    expect(spawnSync("bash", ["-n", DEPLOY]).status).toBe(0);
  });

  test("defaults print today's container, folder and a cron line with both flags, without SSH", () => {
    const r = deploy(["--print-plan"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("container: passionseed-discord-bot\n");
    expect(r.out).toContain("app dir:   ~/passionseed/discord-bot\n");
    expect(r.out).toContain("env file:  ~/passionseed/discord-bot/bot.env\n");
    expect(r.out).toContain(
      "cron line: */5 * * * * python3 ~/passionseed/discord-bot/watchdog.py --name passionseed-discord-bot " +
        "--app ~/passionseed/discord-bot >> ~/passionseed/discord-bot/watchdog.log 2>&1\n",
    );
    expect(sshCalled()).toBe(false);
  });

  test("BOT_NAME for container #2 prints its own folder and a cron line naming it", () => {
    const r = deploy(["--print-plan"], { BOT_NAME: ELEMENTAL });
    expect(r.code).toBe(0);
    expect(r.out).toContain(`container: ${ELEMENTAL}\n`);
    expect(r.out).toContain("app dir:   ~/passionseed/discord-bot-elemental\n");
    expect(r.out).toContain("env file:  ~/passionseed/discord-bot-elemental/bot.env\n");
    expect(r.out).toContain(
      `cron line: */5 * * * * python3 ~/passionseed/discord-bot-elemental/watchdog.py --name ${ELEMENTAL} ` +
        "--app ~/passionseed/discord-bot-elemental >> ~/passionseed/discord-bot-elemental/watchdog.log 2>&1\n",
    );
    expect(r.out).not.toMatch(/discord-bot\//);
    expect(sshCalled()).toBe(false);
  });

  test("is read before the host: works with a host too, and never asks to confirm", () => {
    const r = deploy(["some-host", "--print-plan"], { BOT_NAME: ELEMENTAL });
    expect(r.code).toBe(0);
    expect(r.err).not.toContain("Type the container name");
    expect(sshCalled()).toBe(false);
  });

  test("BOT_APP_DIR and BOT_ENV_FILE override the folder and env file", () => {
    const r = deploy(["--print-plan"], { BOT_NAME: ELEMENTAL, BOT_APP_DIR: "/opt/el", BOT_ENV_FILE: "el.env" });
    expect(r.code).toBe(0);
    expect(r.out).toContain("app dir:   /opt/el\n");
    expect(r.out).toContain("env file:  /opt/el/el.env\n");
    expect(r.out).toContain(`--name ${ELEMENTAL} --app /opt/el >> /opt/el/watchdog.log`);
  });

  test("refuses unsafe values and a second container in the default folder", () => {
    expect(deploy(["--print-plan"], { BOT_NAME: "a b" }).code).toBe(2);
    expect(deploy(["--print-plan"], { BOT_NAME: "x;rm" }).code).toBe(2);
    expect(deploy(["--print-plan"], { BOT_APP_DIR: "../x" }).code).toBe(2);
    expect(deploy(["--print-plan"], { BOT_APP_DIR: "a/$(id)" }).code).toBe(2);
    expect(deploy(["--print-plan"], { BOT_NAME: ELEMENTAL, BOT_APP_DIR: "passionseed/discord-bot" }).code).toBe(2);
  });

  test("with no host and no --print-plan it prints usage", () => {
    const r = deploy([]);
    expect(r.code).toBe(2);
    expect(r.err).toContain("usage:");
  });
});

describe("bot/deploy.sh remote variables", () => {
  test("defaults are today's APP, ENV_FILE and NAME exactly, with no confirm", () => {
    const r = deploy(["fake-host", "--rollback"]);
    expect(r.code).toBe(0);
    expect(r.err).not.toContain("Type the container name");
    expect(fs.readFileSync(path.join(tmp, "ssh.args"), "utf8").trim()).toBe("fake-host bash -s");
    const v = remoteVars();
    expect(v.APP).toBe("/srv/h/passionseed/discord-bot");
    expect(v.ENV_FILE).toBe("/srv/h/passionseed/discord-bot/bot.env");
    expect(v.NAME).toBe("passionseed-discord-bot");
    expect(v.RERUN).toBe("");
    // The common body follows, and no longer sets the three itself.
    expect(v.rest).toContain('if [ ! -f "$ENV_FILE" ]');
    expect(v.rest).not.toMatch(/^(APP|NAME|ENV_FILE)=/m);
  });

  test("a non-default container needs its name typed locally before any SSH", () => {
    const wrong = deploy(["fake-host", "--rollback"], { BOT_NAME: ELEMENTAL }, "passionseed-discord-bot\n");
    expect(wrong.code).toBe(1);
    expect(wrong.err).toContain("Type the container name");
    expect(wrong.err).toContain("nothing was sent");
    expect(sshCalled()).toBe(false);

    const none = deploy(["fake-host", "--rollback"], { BOT_NAME: ELEMENTAL }, "");
    expect(none.code).toBe(1);
    expect(sshCalled()).toBe(false);

    const ok = deploy(["fake-host", "--rollback"], { BOT_NAME: ELEMENTAL }, `${ELEMENTAL}\n`);
    expect(ok.code).toBe(0);
    const v = remoteVars();
    expect(v.APP).toBe("/srv/h/passionseed/discord-bot-elemental");
    expect(v.ENV_FILE).toBe("/srv/h/passionseed/discord-bot-elemental/bot.env");
    expect(v.NAME).toBe(ELEMENTAL);
    expect(v.RERUN).toBe(`BOT_NAME=${ELEMENTAL} `);
  });

  test("the deploy's cron line passes --name and --app, and dedupes on $APP/watchdog.py", () => {
    const src = fs.readFileSync(DEPLOY, "utf8");
    expect(src).toContain(
      'CRON_LINE="*/5 * * * * python3 $APP/watchdog.py --name $NAME --app $APP >> $APP/watchdog.log 2>&1"',
    );
    expect(src).toContain('grep -qF "$APP/watchdog.py"');
  });

  test("ships lib/elemental and keeps DEPS unchanged", () => {
    const src = fs.readFileSync(DEPLOY, "utf8");
    expect(src).toMatch(/^FILES=\(bot .* lib\/elemental tsconfig\.json\)$/m);
    expect(src).toContain("\nDEPS=(discord.js @discordjs/voice @supabase/supabase-js pg tsx gifenc)\n");
  });
});

describe("bot/watchdog.py", () => {
  function python(args: string[], extra: Record<string, string> = {}) {
    return spawnSync("python3", args, {
      cwd: ROOT,
      env: env({ PYTHONDONTWRITEBYTECODE: "1", ...extra }),
      encoding: "utf8",
    });
  }

  function fakeDocker(output: string) {
    fs.writeFileSync(path.join(bin, "docker"), `#!/usr/bin/env bash\necho "$*" >> "$FAKE_DIR/docker.args"\necho '${output}'\n`, {
      mode: 0o755,
    });
  }

  test("compiles", () => {
    const r = python(["-c", "import py_compile,sys; py_compile.compile(sys.argv[1], cfile=sys.argv[2], doraise=True)", WATCHDOG, path.join(tmp, "w.pyc")]);
    expect(r.status).toBe(0);
  });

  test("--help shows today's defaults", () => {
    const r = python([WATCHDOG, "--help"], { HOME: "/srv/h" });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("--name");
    expect(r.stdout).toContain("(default: passionseed-discord-bot)");
    expect(r.stdout).toContain("(default: /srv/h/passionseed/discord-bot)");
    expect(r.stdout).toContain("/srv/h/passionseed/discord-bot/alert-webhook");
  });

  test("watches the named container and keeps its state under --app", () => {
    const app = path.join(tmp, "app");
    fs.mkdirSync(app);

    fakeDocker("exited|");
    let r = python([WATCHDOG, "--name", ELEMENTAL, "--app", app]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(`${ELEMENTAL} exited, 0 min`);
    expect(fs.readFileSync(path.join(tmp, "docker.args"), "utf8")).toContain(ELEMENTAL);
    const down = JSON.parse(fs.readFileSync(path.join(app, "watchdog.state"), "utf8"));
    expect(down.bad_since).toEqual(expect.any(Number));
    expect(down.alerted).toBe(false);

    fakeDocker("running|healthy");
    r = python([WATCHDOG, "--name", ELEMENTAL, "--app", app]);
    expect(r.status).toBe(0);
    expect(JSON.parse(fs.readFileSync(path.join(app, "watchdog.state"), "utf8"))).toEqual({
      bad_since: null,
      alerted: false,
    });
  });

  test("alert text names the container, not SHIFT voice", () => {
    const src = fs.readFileSync(WATCHDOG, "utf8");
    expect(src).not.toContain("SHIFT voice");
    expect(src.match(/\[TH-REVIEW\]/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
