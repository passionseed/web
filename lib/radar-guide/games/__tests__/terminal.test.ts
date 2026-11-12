import * as fx from "../__fixtures__/engines";
import {
  allMissionsDone,
  answerMission,
  answerPoll,
  decide,
  decisionOpen,
  findCommand,
  initTerminal,
  normalizeCommand,
  parseDoneWhen,
  pendingQuestion,
  runCommand,
  solvedTerminal,
  tapOutputLine,
  terminalChips,
  terminalLocal,
  type TerminalState,
} from "../terminal";

const data = fx.terminal;
const run = (s: TerminalState, ...cmds: string[]) => cmds.reduce((acc, c) => runCommand(acc, data, c), s);
const lastOutput = (s: TerminalState) => s.lines.filter((l) => l.kind !== "input").at(-1)?.text;

test("input is trimmed and inner spaces collapsed", () => {
  expect(normalizeCommand("   cat    scope.txt  ")).toBe("cat scope.txt");
  expect(normalizeCommand("Ls -a")).toBe("ls -a");
  expect(findCommand(data, "  cat   scope.txt")?.effect).toBe("scopeRead");
});

test('unknown commands give "ไม่มีคำสั่งนี้ในแล็บ ลอง help"', () => {
  const s = run(initTerminal(), "rm -rf /");
  expect(s.lines.at(-1)).toMatchObject({ kind: "error", text: "ไม่มีคำสั่งนี้ในแล็บ ลอง help" });
});

test('grep -c "Failed" with and without quotes gives 41', () => {
  expect(lastOutput(run(initTerminal(), 'grep -c "Failed" auth.log'))).toBe("41");
  expect(lastOutput(run(initTerminal(), "grep -c Failed auth.log"))).toBe("41");
  expect(lastOutput(run(initTerminal(), "grep -c 'Failed' auth.log"))).toBe("41");
});

test("scan chips stay hidden until cat scope.txt", () => {
  const before = terminalChips(initTerminal(), data).map((c) => c.command);
  expect(before.some((c) => c.startsWith("scan"))).toBe(false);
  expect(before).toContain("cat scope.txt");
  const after = terminalChips(run(initTerminal(), "cat scope.txt"), data);
  expect(after.map((c) => c.command)).toEqual(expect.arrayContaining(["scan lab.local", "scan school-web"]));
  const tempting = after.find((c) => c.command === "scan school-web")!;
  expect(tempting).toMatchObject({ danger: true, labelTh: "สแกนเว็บโรงเรียน ที่ดูหละหลวมมาก" });
});

test("out-of-scope commands increment scopeTries and show the stop card", () => {
  const s = run(initTerminal(), "cat scope.txt", "scan school-web", "scan school-web");
  expect(s.scopeTries).toBe(2);
  expect(s.lines.at(-1)).toMatchObject({ kind: "alert" });
  expect(terminalLocal(s)).toEqual({ missions: [1], flag: false, scopeTries: 2 });
});

test("missions: question, tap a line, flag, decision", () => {
  let s = run(initTerminal(), "cat scope.txt");
  expect(s.missionsDone).toEqual([1]);

  s = run(s, 'grep -c "Failed" auth.log');
  expect(pendingQuestion(s, data)?.id).toBe(2);
  s = answerMission(s, data, 2, "4");
  expect(s.missionsDone).not.toContain(2);
  expect(s.feedback?.tone).toBe("bad");
  s = answerMission(s, data, 2, "41");
  expect(s.missionsDone).toContain(2);

  s = run(s, 'grep "Accepted" auth.log');
  const hits = s.lines.filter((l) => l.tappable);
  expect(hits).toHaveLength(4);
  s = tapOutputLine(s, data, hits.find((l) => l.text.includes("publickey"))!.id);
  expect(s.feedback?.tone).toBe("bad");
  s = tapOutputLine(s, data, hits.find((l) => l.text.includes("Accepted password"))!.id);
  expect(s.missionsDone).toContain(3);
  expect(s.feedback?.text).toBe("บรรทัดนี้แหละ");

  s = run(s, "ls -a");
  expect(s.lines.at(-1)).toMatchObject({ kind: "note", text: "ไฟล์ที่ขึ้นต้นด้วยจุดถูกซ่อนไว้" });
  s = run(s, "cat .flag");
  expect(s.flag).toBe(true);
  expect(s.missionsDone).toContain(4);

  expect(decisionOpen(s, data)).toBe(true);
  s = decide(s, data, "block");
  expect(allMissionsDone(s, data)).toBe(false);
  s = decide(s, data, "lock");
  expect(allMissionsDone(s, data)).toBe(true);

  s = answerPoll(s, data, "depends");
  expect(answerPoll(s, data, "ok").poll).toBe("depends");
});

test("clear empties the screen; help chip is offered", () => {
  const s = run(initTerminal(), "ls", "clear");
  expect(s.lines).toEqual([]);
  expect(terminalChips(initTerminal(), data).map((c) => c.command)).toContain("help");
});

test("nothing typed is kept outside the session state", () => {
  const typed = "cat   secret-diary.txt";
  const s = run(initTerminal(), typed, "cat scope.txt");
  const local = JSON.stringify(terminalLocal(s));
  expect(local).not.toContain("secret");
  expect(local).not.toContain("scope.txt");
  expect(Object.keys(terminalLocal(s)).sort()).toEqual(["flag", "missions", "scopeTries"]);
});

test("doneWhen parsing and the solved state", () => {
  expect(parseDoneWhen('ran:grep "Accepted" auth.log && tap:Accepted password')).toEqual([
    { type: "ran", command: "grep Accepted auth.log" },
    { type: "tap", text: "Accepted password" },
  ]);
  const solved = solvedTerminal(data);
  expect(allMissionsDone(solved, data)).toBe(true);
  expect(solved.decision).toBe("lock");
});
