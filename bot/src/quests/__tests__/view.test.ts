/**
 * @jest-environment node
 */
import { AttachmentBuilder, ButtonStyle, MessageFlags } from "discord.js";

import { QuestDbError, QuestError } from "../api";
import { T, safe, safePost } from "../copy";
import { outboxView } from "../outbox";
import {
  LIMITS,
  NO_MENTIONS,
  TONE_COLORS,
  button,
  buttonRows,
  commandIdMap,
  linkCommands,
  renderView,
  selectRow,
  show,
  showError,
  GateError,
  type Block,
} from "../ui";
import { accentColor, bodyText, componentCount, customIds, mediaUrls, textLength, viewText } from "../test-helpers/view";

const png = (name = "shift-island.png") => new AttachmentBuilder(Buffer.from([0x89, 0x50, 0x4e, 0x47]), { name, description: "เกาะ SHIFT" });

describe("renderView", () => {
  it("sends one private Components V2 card that pings nobody", () => {
    const payload = renderView({ tone: "island", title: "🏝️ เกาะ SHIFT", blocks: [{ kind: "text", text: "สวัสดี" }] });
    expect(payload.flags).toBe(MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral);
    expect(payload.allowedMentions).toEqual(NO_MENTIONS);
    expect(payload.components).toHaveLength(1);
    expect(accentColor(payload)).toBe(TONE_COLORS.island);
    expect(bodyText(payload)).toBe("### 🏝️ เกาะ SHIFT\nสวัสดี");
    expect(Object.keys(payload)).not.toContain("content");
    // Edits and channel posts: V2 without Ephemeral.
    expect(renderView({ content: "x" }, { ephemeral: false }).flags).toBe(MessageFlags.IsComponentsV2);
  });

  it("keeps legacy content working as a neutral card", () => {
    const payload = renderView({ content: "บันทึกแล้ว\n-# เห็นแค่คุณ", rows: buttonRows([button("sq|is_view", "🏝️ กลับเกาะ")]) });
    expect(bodyText(payload)).toBe("บันทึกแล้ว\n-# เห็นแค่คุณ");
    expect(viewText(payload)).toBe("บันทึกแล้ว\n-# เห็นแค่คุณ\n🏝️ กลับเกาะ");
    expect(customIds(payload)).toEqual(["sq|is_view"]);
    expect(accentColor(payload)).toBe(TONE_COLORS.neutral);
    // Nothing at all still renders a valid card.
    expect(() => renderView({ content: "" }).components[0].toJSON()).not.toThrow();
  });

  it("puts a leading picture above the title as a gallery item, and joins text and subtext", () => {
    const payload = renderView({
      title: "หัวข้อ",
      blocks: [
        { kind: "image", name: "shift-island.png", alt: "เกาะ" },
        { kind: "text", text: "บรรทัดหนึ่ง" },
        { kind: "subtext", text: "เล็ก\nเล็กอีก" },
        { kind: "divider" },
        { kind: "section", text: "มีปุ่ม", button: button("sq|is_how", "ℹ️") },
      ],
      files: [png()],
    });
    const card = payload.components[0].toJSON() as { components: { type: number; items?: { media: { url: string }; description?: string }[] }[] };
    expect(card.components.map((c) => c.type)).toEqual([12, 10, 14, 9]);
    expect(card.components[0].items![0]).toMatchObject({ media: { url: "attachment://shift-island.png" }, description: "เกาะ" });
    expect(bodyText(payload)).toBe("### หัวข้อ\nบรรทัดหนึ่ง\n-# เล็ก\n-# เล็กอีก\nมีปุ่ม");
    expect(customIds(payload)).toEqual(["sq|is_how"]);
    expect(payload.files).toHaveLength(1);
  });

  it("shows every attached file, even one no block mentions", () => {
    const json = new AttachmentBuilder(Buffer.from("{}"), { name: "export.json" });
    const payload = renderView({ content: "ไฟล์ของคุณ", files: [png("a.png"), json] });
    expect(mediaUrls(payload)).toEqual(["attachment://a.png", "attachment://export.json"]);
    const card = payload.components[0].toJSON() as { components: { type: number }[] };
    expect(card.components.map((c) => c.type)).toEqual([10, 12, 13]);
    // A picture that was never attached (its drawing failed) is left out, not sent as a broken link.
    expect(mediaUrls(renderView({ blocks: [{ kind: "image", name: "gone.png" }, { kind: "text", text: "ยังอยู่" }] }))).toEqual([]);
    // Referenced once: not shown twice.
    expect(mediaUrls(renderView({ blocks: [{ kind: "file", name: "export.json" }], files: [json] }))).toEqual(["attachment://export.json"]);
  });

  it("drops blocks from the end to fit 40 components, never the buttons, and logs one line", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const blocks: Block[] = [];
      for (let n = 0; n < 30; n++) blocks.push({ kind: "section", text: `แถว ${n}`, button: button(`sq|x|${n}`, `${n}`) });
      const rows = buttonRows(Array.from({ length: 10 }, (_, n) => button(`sq|r|${n}`, `r${n}`)));
      const payload = renderView({ title: "ยาว", blocks, rows }, { action: "is_view" });
      expect(componentCount(payload)).toBeLessThanOrEqual(LIMITS.components);
      expect(customIds(payload).filter((id) => id.startsWith("sq|r|"))).toHaveLength(10);
      expect(viewText(payload)).toContain("แถว 0");
      expect(viewText(payload)).not.toContain("แถว 29");
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toMatch(/^\[shift-quests\] view trimmed action=is_view components=\d+->\d+/);
      expect(() => payload.components[0].toJSON()).not.toThrow();
    } finally {
      warn.mockRestore();
    }
  });

  it("clips text to Discord's 4000 characters", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const payload = renderView({ title: "t", blocks: [{ kind: "text", text: "ก".repeat(3000) }, { kind: "text", text: "ข".repeat(3000) }] });
      expect(textLength(payload)).toBeLessThanOrEqual(LIMITS.text);
      expect(bodyText(payload)).toContain("ก".repeat(100));
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it("counts components the way Discord does", () => {
    const payload = renderView({
      blocks: [
        { kind: "text", text: "a" },
        { kind: "section", text: ["b", "c"], button: button("sq|y", "y") },
        { kind: "image", name: "a.png" },
        { kind: "image", name: "b.png" },
      ],
      rows: [selectRow("sq|s", "เลือก", [{ label: "หนึ่ง", value: "1" }])],
      files: [png("a.png"), png("b.png")],
    });
    // container 1 + text 1 + section (1 + 2 texts + button) 4 + gallery (1 + 2 items) 3 + row (1 + select) 2
    expect(componentCount(payload)).toBe(11);
    expect(viewText(payload)).toContain("หนึ่ง");
  });
});

describe("command mentions", () => {
  const ids = commandIdMap([
    { id: "11", name: "island" },
    { id: "22", name: "project", options: [{ type: 1, name: "invite" }, { type: 1, name: "new" }] },
    { id: "33", name: "admin", options: [{ type: 2, name: "feature", options: [{ type: 1, name: "set" }] }, { type: 3, name: "x" }] },
    { id: "44", name: "help" },
  ]);

  it("maps commands and subcommands to their command's ID (a group alone is not a command)", () => {
    expect(Object.fromEntries(ids)).toEqual({
      island: "11",
      project: "22",
      "project invite": "22",
      "project new": "22",
      admin: "33",
      "admin feature set": "33",
      help: "44",
    });
  });

  it("links whole command tokens only", () => {
    expect(linkCommands("/island", ids)).toBe("</island:11>");
    expect(linkCommands("ใช้ /island ได้เลย", ids)).toBe("ใช้ </island:11> ได้เลย");
    expect(linkCommands("ชวนด้วย /project invite แล้ว", ids)).toBe("ชวนด้วย </project invite:22> แล้ว");
    expect(linkCommands("ดู /help.", ids)).toBe("ดู </help:44>.");
    expect(linkCommands("(/island)", ids)).toBe("(</island:11>)");
    expect(linkCommands('"/island"', ids)).toBe('"</island:11>"');
    expect(linkCommands("ใน/islandได้", ids)).toBe("ใน</island:11>ได้");
    // An unknown subcommand word stays as text after the linked command.
    expect(linkCommands("/project zap now", ids)).toBe("</project:22> zap now");
    expect(linkCommands("/help me", ids)).toBe("</help:44> me");
  });

  it("leaves URLs, code, unknown commands and an empty map alone", () => {
    for (const text of [
      "https://passionseed.org/island",
      "ดู https://x.org/help ก่อน",
      "พิมพ์ `/island` เอง",
      "```\n/island\n```",
      "/unknown",
      "/islands",
      "a/island",
      "/island/x",
      "</island:11>",
    ]) {
      expect(linkCommands(text, ids)).toBe(text);
    }
    expect(linkCommands("ใช้ /island", new Map())).toBe("ใช้ /island");
  });

  it("links bot copy inside cards, never button labels", () => {
    const payload = renderView(
      { title: "ไป /island", blocks: [{ kind: "subtext", text: "ผลแจ้งใน /help" }], rows: buttonRows([button("sq|a", "/island")]) },
      { commands: ids }
    );
    expect(bodyText(payload)).toBe("### ไป </island:11>\n-# ผลแจ้งใน </help:44>");
    expect(viewText(payload)).toContain("\n/island");
  });
});

/** A minimal interaction that records which call show() used. */
function interaction(kind: "button" | "command", state: { deferred?: boolean; replied?: boolean; message?: unknown } = {}) {
  const calls: { via: string; payload: Record<string, unknown> }[] = [];
  const record = (via: string) => async (payload: Record<string, unknown>) => {
    calls.push({ via, payload });
  };
  const i = {
    deferred: state.deferred ?? false,
    replied: state.replied ?? false,
    message: state.message,
    customId: "sq|is_view",
    isChatInputCommand: () => kind === "command",
    isMessageComponent: () => kind === "button",
    isButton: () => kind === "button",
    reply: record("reply"),
    update: record("update"),
    editReply: record("editReply"),
    followUp: record("followUp"),
    commandName: "island",
    options: { getSubcommand: () => null },
  };
  return { i: i as never, calls };
}

describe("show", () => {
  const view = { title: "การ์ด", blocks: [{ kind: "text" as const, text: "เนื้อหา" }] };

  it("sends V2 on every path, private on new messages", async () => {
    const cases = [
      { kind: "command" as const, state: {}, replace: false, via: "reply", flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral },
      { kind: "button" as const, state: {}, replace: true, via: "update", flags: MessageFlags.IsComponentsV2 },
      { kind: "command" as const, state: { deferred: true }, replace: false, via: "editReply", flags: MessageFlags.IsComponentsV2 },
      { kind: "button" as const, state: { replied: true }, replace: false, via: "followUp", flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral },
      { kind: "button" as const, state: {}, replace: false, via: "reply", flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral },
    ];
    for (const c of cases) {
      const { i, calls } = interaction(c.kind, c.state);
      await show(i, view, { replace: c.replace });
      expect([c.via, calls.map((x) => x.via)]).toEqual([c.via, [c.via]]);
      const payload = calls[0].payload;
      expect([c.via, payload.flags]).toEqual([c.via, c.flags]);
      expect(payload.allowedMentions).toEqual(NO_MENTIONS);
      expect(payload.content).toBeUndefined();
      expect(bodyText(payload)).toBe("### การ์ด\nเนื้อหา");
    }
  });

  it("clears the content of a message sent before cards when editing it", async () => {
    const legacy = interaction("button", { message: { content: "ข้อความเก่า", embeds: [] } });
    await show(legacy.i, view, { replace: true });
    expect(legacy.calls[0].payload).toMatchObject({ content: null, embeds: [], flags: MessageFlags.IsComponentsV2 });
    const card = interaction("button", { message: { content: "", embeds: [] } });
    await show(card.i, view, { replace: true });
    expect("content" in card.calls[0].payload).toBe(false);
  });

  it("shows errors as an error card with the reference as subtext", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const { i, calls } = interaction("button");
      const ref = await showError(i, new QuestError("not_found"));
      const payload = calls[0].payload;
      expect(accentColor(payload)).toBe(TONE_COLORS.error);
      expect(bodyText(payload).split("\n").at(-1)).toBe(`-# อ้างอิง ${ref}`);
      expect(payload.flags).toBe(MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral);
    } finally {
      warn.mockRestore();
    }
  });

  it("shows a friendly 'not yet' without the error colour or a reference, and real failures with both", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      for (const refusal of [new GateError(T.notStarted), new QuestError("not_started"), new QuestError("squads_off")]) {
        const { i, calls } = interaction("command");
        const ref = await showError(i, refusal);
        const payload = calls[0].payload;
        expect(accentColor(payload)).not.toBe(TONE_COLORS.error);
        expect(bodyText(payload)).not.toContain("อ้างอิง");
        expect(bodyText(payload).startsWith(`### ${T.notYetTitle}\n`)).toBe(true);
        // The reference is still logged and returned.
        expect(ref).toMatch(/^[A-Z2-9]{6}$/);
        expect(warn.mock.calls.flat().join(" ")).toContain(`ref=${ref}`);
      }
      const { i, calls } = interaction("command");
      const ref = await showError(i, new QuestDbError("shift_quest_island", "57014"));
      expect(accentColor(calls[0].payload)).toBe(TONE_COLORS.error);
      expect(bodyText(calls[0].payload).split("\n").at(-1)).toBe(`-# อ้างอิง ${ref}`);
    } finally {
      warn.mockRestore();
      error.mockRestore();
    }
  });

  it("after a failed button press that was deferred, the error card keeps a retry and a way back", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      // The back-to-island button itself: retry it, no second island button.
      const back = interaction("button", { deferred: true });
      await showError(back.i, new Error("boom"));
      expect(back.calls[0].via).toBe("editReply");
      expect(customIds(back.calls[0].payload)).toEqual(["sq|is_view"]);
      expect(viewText(back.calls[0].payload)).toContain(T.btnRetry);

      const other = interaction("button", { deferred: true });
      (other.i as unknown as { customId: string }).customId = "sq|is_tap";
      await showError(other.i, new Error("boom"));
      expect(customIds(other.calls[0].payload)).toEqual(["sq|is_tap", "sq|is_view"]);

      // Commands get no retry button (nothing to press again).
      const command = interaction("command");
      await showError(command.i, new Error("boom"));
      expect(customIds(command.calls[0].payload)).toEqual([]);
    } finally {
      error.mockRestore();
    }
  });
});

describe("student text and command links", () => {
  const ids = commandIdMap([
    { id: "1", name: "admin", options: [{ type: 1, name: "season" }] },
    { id: "3", name: "data" },
    { id: "4", name: "project" },
    { id: "9", name: "start" },
  ]);

  it("never turns a student's words into a bot command chip", () => {
    const payload = renderView({ blocks: [{ kind: "text", text: `> ${safePost("ลองพิมพ์ /admin season ดูสิ")}` }] }, { commands: ids });
    expect(bodyText(payload)).not.toContain("</admin");
    expect(bodyText(payload)).toContain("ลองพิมพ์ /");
    for (const said of ["รันสคริปต์ /start.sh", "ไฟล์ /data.csv", "ไปที่ /project"]) {
      expect(bodyText(renderView({ blocks: [{ kind: "text", text: safe(said) }] }, { commands: ids }))).not.toMatch(/<\/\w/);
    }
  });

  it("leaves web addresses and file names alone, even in bot copy", () => {
    const url = "https://www.notion.so/ทีมเรา/project?pvs=4";
    expect(linkCommands(`ดูที่ ${url}`, ids)).toBe(`ดูที่ ${url}`);
    expect(linkCommands("https://th.wikipedia.org/wiki/การทดลอง/data.", ids)).toBe("https://th.wikipedia.org/wiki/การทดลอง/data.");
    expect(linkCommands("แก้ไฟล์ /data.csv แล้ว", ids)).toBe("แก้ไฟล์ /data.csv แล้ว");
    // Bot copy still links, also at the end of a sentence.
    expect(linkCommands("ใช้ /data.", ids)).toBe("ใช้ </data:3>.");
    // A student's address survives safe() and the renderer whole.
    expect(bodyText(renderView({ blocks: [{ kind: "text", text: safe(`หลักฐาน ${url}`) }] }, { commands: ids }))).toContain(url);
  });

  it("lets no student text form a masked link", () => {
    expect(safe("[รับเหรียญฟรี](https://x.co/a)")).toBe("\\[รับเหรียญฟรี](https://x.co/a)");
    expect(safePost("[a](https://x.co)")).toBe("\\[a](https://x.co)");
  });
});

describe("trimming", () => {
  it("clips a long block no shorter than its first line, then takes the rest from the next one", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const notice = (n: number) => `💬 **งาน ${n}** ขอข้อมูลเพิ่ม\n${"> ".concat("ก".repeat(3000))}`;
      const payload = renderView({ blocks: [1, 2, 3].map((n): Block => ({ kind: "text", text: notice(n) })).flatMap((b) => [b, { kind: "divider" } as Block]) });
      expect(textLength(payload)).toBeLessThanOrEqual(LIMITS.text);
      const body = bodyText(payload);
      for (const n of [1, 2, 3]) expect(body).toContain(`💬 **งาน ${n}** ขอข้อมูลเพิ่ม`);
      expect(body.split("\n").filter((line) => line.trim() === "…")).toEqual([]);
    } finally {
      warn.mockRestore();
    }
  });
});

describe("outbox cards", () => {
  it("puts the island picture on top and the signs below, and falls back to text without it", () => {
    const post = { title: "🏝️ เกาะสัปดาห์นี้", body: "", note: "", mentionUserIds: [] };
    const withPicture = renderView(outboxView("island_weekly", post, { signs: ["#1 ร้าน"], files: [png()] }), { ephemeral: false });
    expect(withPicture.flags).toBe(MessageFlags.IsComponentsV2);
    expect(mediaUrls(withPicture)).toEqual(["attachment://shift-island.png"]);
    expect(bodyText(withPicture)).toBe("### 🏝️ เกาะสัปดาห์นี้\n-# 🪧 ป้ายชื่อบนเกาะ: #1 ร้าน");
    expect(accentColor(withPicture)).toBe(TONE_COLORS.island);
    const textOnly = renderView(outboxView("island_weekly", post, { signs: [], files: [] }), { ephemeral: false });
    expect(mediaUrls(textOnly)).toEqual([]);
    expect(bodyText(textOnly)).toBe("### 🏝️ เกาะสัปดาห์นี้");
    expect(accentColor(renderView(outboxView("review_needed", { ...post, title: "📝 งานรอรีวิว" })))).toBe(TONE_COLORS.staff);
  });
});

it("keeps button labels to Discord's 80 characters", () => {
  expect(button("sq|a", "ก".repeat(100), ButtonStyle.Primary).toJSON()).toMatchObject({ label: "ก".repeat(80) });
});
