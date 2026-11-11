import {
  ChannelType,
  InteractionContextType,
  REST,
  Routes,
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";

/**
 * SHIFT High quest slash commands, registered per guild. Staff commands are
 * hidden from members without Manage Server by default; a server admin can
 * show them to the mentor role in Server Settings > Integrations. Visibility
 * is convenience only: the database checks application roles on every call.
 */
function guildCommand(name: string, description: string): SlashCommandBuilder {
  return new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    // Never in DMs: a private exchange with the bot is the signal students
    // must learn not to trust (see bot/README.md, safeguarding).
    .setContexts(InteractionContextType.Guild);
}

const FEATURES = [
  { name: "awards (Passioncoin)", value: "awards" },
  { name: "redemption (แลกของ)", value: "redemption" },
  { name: "sharing (โพสต์สาธารณะ)", value: "sharing" },
  { name: "reminders (การเตือน)", value: "reminders" },
  // Off until founder decision 5 picks the island for squads; needs nothing published first.
  { name: "squads (สควอด)", value: "squads" },
];

export function questCommands(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
  const start = guildCommand("start", "เริ่มใช้ SHIFT High quests: เป้าหมาย ความเป็นส่วนตัว และวิธีขอความช่วยเหลือ");

  // The student surface is /island: one view, one-tap actions. /quest and
  // /progress stay as handlers behind its buttons but are not registered.
  const island = guildCommand("island", "เกาะ SHIFT: ต้นไม้ของคุณ ขั้นต่อไป และ Demo Day");

  const project = guildCommand("project", "โปรเจกต์และเพื่อนร่วมทีม")
    .addSubcommand((s) => s.setName("new").setDescription("สร้างโปรเจกต์"))
    .addSubcommand((s) => s.setName("list").setDescription("โปรเจกต์ของคุณและคำชวน"))
    .addSubcommand((s) =>
      s
        .setName("invite")
        .setDescription("ชวนเพื่อนเข้าโปรเจกต์ปัจจุบัน (เขาต้องตอบรับเอง)")
        .addUserOption((o) => o.setName("user").setDescription("เพื่อนที่จะชวน").setRequired(true))
    )
    .addSubcommand((s) => s.setName("view").setDescription("ดูเส้นทางของโปรเจกต์ปัจจุบัน"))
    .addSubcommand((s) => s.setName("ownership").setDescription("เช็กลิสต์: ทำงานนี้ต่อได้เองหลังจบแคมป์"))
    .addSubcommand((s) => s.setName("leave").setDescription("ออกจากโปรเจกต์ปัจจุบัน"));

  const work = guildCommand("work", "นั่งทำงาน (ไม่บังคับ ไม่มีการนับเวลา)")
    .addSubcommand((s) =>
      s
        .setName("start")
        .setDescription("ตั้งใจว่าจะทำอะไรในรอบนี้")
        .addStringOption((o) => o.setName("intention").setDescription("รอบนี้จะทำอะไร").setRequired(true).setMaxLength(300))
        .addBooleanOption((o) => o.setName("share").setDescription("แชร์ในห้อง coworking (ดูตัวอย่างก่อนโพสต์)"))
    )
    .addSubcommand((s) =>
      s
        .setName("end")
        .setDescription("จบรอบ และสะท้อนสั้นๆ (ไม่บังคับ)")
        .addStringOption((o) => o.setName("reflection").setDescription("ได้อะไรจากรอบนี้").setMaxLength(1000))
    );

  // Always "สควอด", never "ทีม": students already say ทีม for their project team.
  const squad = guildCommand("squad", "สควอดเล็ก 3 ถึง 4 คน สปรินต์สั้นๆ กับเป้าที่ตั้งเอง (ไม่บังคับ นักเรียนเท่านั้น)")
    .addSubcommand((s) =>
      s
        .setName("new")
        .setDescription("ตั้งสควอดใหม่")
        .addStringOption((o) => o.setName("name").setDescription("ชื่อสควอด").setRequired(true).setMaxLength(60))
        // Required: a squad is a sprint toward a target it chose, and the database refuses a squad without one.
        .addStringOption((o) => o.setName("target").setDescription("เป้าของรอบนี้ (ตั้งกันเอง)").setRequired(true).setMaxLength(200))
        .addIntegerOption((o) => o.setName("days").setDescription("กี่วัน (ค่าเริ่มต้น 14)").setMinValue(3).setMaxValue(28))
    )
    .addSubcommand((s) =>
      s
        .setName("invite")
        .setDescription("ชวนเพื่อนเข้าสควอด (เขาต้องตอบรับเอง คำชวนอยู่ได้ 3 วัน)")
        .addUserOption((o) => o.setName("user").setDescription("เพื่อน").setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName("withdraw")
        .setDescription("ถอนคำชวนเข้าสควอดที่คุณส่งไปและยังไม่มีคำตอบ")
        .addUserOption((o) => o.setName("user").setDescription("เพื่อนที่คุณชวนไว้").setRequired(true))
    )
    .addSubcommand((s) => s.setName("view").setDescription("ดูสควอดและคำชวน"));

  const help = guildCommand("help", "ขอความช่วยเหลือในห้องกลุ่ม ไม่ต้องใช้เหรียญ");
  const celebrate = guildCommand("celebrate", "แชร์ความสำเร็จ หรือขอบคุณเพื่อน (ดูตัวอย่างก่อนโพสต์)").addUserOption((o) =>
    o.setName("peer").setDescription("เพื่อนที่อยากขอบคุณ (เขาต้องตอบรับก่อนโพสต์)")
  );
  const inbox = guildCommand("inbox", "ข้อความส่วนตัว ผลรีวิว คำชวน และคำขอยืนยัน");
  const coins = guildCommand("coins", "ยอด Passioncoin และประวัติ (เห็นแค่คุณ)");
  const rewards = guildCommand("rewards", "ของที่แลกได้ และคำขอแลกของคุณ");
  const settings = guildCommand("settings", "การเตือนและการแจ้งเตือน");
  const data = guildCommand("data", "ส่งออก แก้ไข หรือขอลบข้อมูลของคุณ");

  const review = guildCommand("review", "ทีมพี่เลี้ยง: รีวิว ความช่วยเหลือ เหรียญที่ค้าง")
    .setDefaultMemberPermissions(0)
    .addSubcommand((s) => s.setName("queue").setDescription("งานรอรีวิว อุทธรณ์ และเควสต์ที่เสนอ"))
    .addSubcommand((s) => s.setName("help").setDescription("คิวคำขอความช่วยเหลือ"))
    .addSubcommand((s) => s.setName("awards").setDescription("งานที่อนุมัติแล้วแต่ยังไม่ได้ออกเหรียญ"));

  const fulfill = guildCommand("fulfill", "ทีมจัดส่ง: คำขอแลกของ").setDefaultMemberPermissions(0);

  const admin = guildCommand("admin", "แอดมิน SHIFT High quests")
    .setDefaultMemberPermissions(0)
    .addSubcommand((s) => s.setName("status").setDescription("สถานะ การตั้งค่า และสิ่งที่ยังขาด"))
    .addSubcommand((s) =>
      s
        .setName("feature")
        .setDescription("เปิดหรือพักฟีเจอร์ (เปิดได้เมื่อตั้งค่าครบเท่านั้น)")
        .addStringOption((o) => o.setName("name").setDescription("ฟีเจอร์").setRequired(true).addChoices(...FEATURES))
        .addStringOption((o) =>
          o.setName("state").setDescription("เปิดหรือปิด").setRequired(true).addChoices({ name: "on", value: "on" }, { name: "off", value: "off" })
        )
    )
    .addSubcommand((s) =>
      s
        .setName("channel")
        .setDescription("ตั้งห้อง (เว้นห้องว่างเพื่อล้าง)")
        .addStringOption((o) =>
          o
            .setName("kind")
            .setDescription("ห้องสำหรับอะไร")
            .setRequired(true)
            .addChoices(
              { name: "help (ชุมชน)", value: "help" },
              { name: "staff (ทีมพี่เลี้ยง)", value: "staff" },
              { name: "celebrate (โพสต์ความสำเร็จ)", value: "celebrate" },
              { name: "coworking (ห้องข้อความหรือห้องเสียง)", value: "coworking" }
            )
        )
        // coworking may be a voice channel: its people sit at the island's campfire, and intention posts land in its text chat.
        .addChannelOption((o) => o.setName("channel").setDescription("ห้อง").addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice))
    )
    .addSubcommand((s) =>
      s
        .setName("student-role")
        .setDescription("บทบาท Discord ของนักเรียนนำร่อง")
        .addStringOption((o) =>
          o.setName("action").setDescription("เพิ่มหรือลบ").setRequired(true).addChoices({ name: "add", value: "add" }, { name: "remove", value: "remove" })
        )
        .addRoleOption((o) => o.setName("role").setDescription("บทบาท").setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName("terms")
        .setDescription("ประกาศกติกาและเงื่อนไข")
        .addStringOption((o) =>
          o
            .setName("kind")
            .setDescription("เรื่อง")
            .setRequired(true)
            .addChoices(
              { name: "reward_terms (กติกาเหรียญ)", value: "reward_terms" },
              { name: "redemption_terms (เงื่อนไขแลก)", value: "redemption_terms" },
              { name: "fulfillment_process (ขั้นตอนจัดส่งที่ผู้ปกครองกรอก)", value: "fulfillment_process" },
              { name: "fulfillment_owner (ผู้รับผิดชอบจัดส่ง)", value: "fulfillment_owner" }
            )
        )
    )
    .addSubcommand((s) =>
      s
        .setName("role")
        .setDescription("ให้หรือถอนบทบาทในแอป (สิทธิ์แอดมินเซิร์ฟเวอร์ไม่นับ)")
        .addUserOption((o) => o.setName("user").setDescription("คน").setRequired(true))
        .addStringOption((o) =>
          o
            .setName("role")
            .setDescription("บทบาท")
            .setRequired(true)
            .addChoices({ name: "reviewer", value: "reviewer" }, { name: "admin", value: "admin" }, { name: "fulfillment", value: "fulfillment" })
        )
        .addStringOption((o) =>
          o.setName("action").setDescription("ให้หรือถอน").setRequired(true).addChoices({ name: "grant", value: "grant" }, { name: "revoke", value: "revoke" })
        )
    )
    .addSubcommand((s) =>
      s
        .setName("rule")
        .setDescription("เผยแพร่กติกาเหรียญเวอร์ชันใหม่")
        .addStringOption((o) => o.setName("key").setDescription("ชื่อกติกา a-z 0-9 -").setRequired(true).setMaxLength(40))
        .addIntegerOption((o) => o.setName("amount").setDescription("จำนวนเหรียญ").setRequired(true).setMinValue(1).setMaxValue(100000))
        .addIntegerOption((o) => o.setName("cap").setDescription("สูงสุดกี่ครั้งต่อคน").setMinValue(1))
        .addStringOption((o) =>
          o
            .setName("team_allocation")
            .setDescription("งานทีม (เว้นว่าง = งานทีมยังไม่ได้เหรียญ)")
            .addChoices(
              { name: "each_confirmed (ทุกคนที่ยืนยันได้เต็มจำนวน)", value: "each_confirmed" },
              { name: "split_confirmed (แบ่งเท่ากัน)", value: "split_confirmed" }
            )
        )
    )
    .addSubcommand((s) =>
      s
        .setName("template-rule")
        .setDescription("ผูกกติกาเหรียญกับเควสต์ตัวอย่าง (มีผลกับเควสต์ที่เลือกหลังจากนี้)")
        .addStringOption((o) => o.setName("template").setDescription("slug ของเควสต์ (ดู /admin templates)").setRequired(true))
        .addStringOption((o) => o.setName("rule").setDescription("ชื่อกติกา (เว้นว่างเพื่อถอด)"))
    )
    .addSubcommand((s) => s.setName("templates").setDescription("รายการเควสต์ตัวอย่าง"))
    .addSubcommand((s) =>
      s
        .setName("template")
        .setDescription("เปิดหรือเก็บเควสต์ตัวอย่าง (เควสต์ที่เลือกไปแล้วทำต่อได้)")
        .addStringOption((o) => o.setName("template").setDescription("slug").setRequired(true))
        .addBooleanOption((o) => o.setName("publish").setDescription("true = เปิด, false = เก็บ").setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName("catalog")
        .setDescription("เพิ่มหรือแก้ของที่แลกได้ (เว้น item เพื่อเพิ่มใหม่)")
        .addStringOption((o) => o.setName("item").setDescription("ของที่จะแก้").setAutocomplete(true))
        .addStringOption((o) => o.setName("name").setDescription("ชื่อ").setMaxLength(80))
        .addIntegerOption((o) => o.setName("cost").setDescription("ราคา (เหรียญ)").setMinValue(1))
        .addIntegerOption((o) => o.setName("stock_change").setDescription("เพิ่ม/ลดสต็อก เช่น 10 หรือ -2"))
        .addBooleanOption((o) => o.setName("active").setDescription("เปิดให้แลก"))
        .addStringOption((o) => o.setName("description").setDescription("รายละเอียด").setMaxLength(1000))
    )
    .addSubcommand((s) =>
      s
        .setName("ledger")
        .setDescription("ประวัติเหรียญของคนหนึ่ง และปรับคืนแบบมีเหตุผล")
        .addUserOption((o) => o.setName("user").setDescription("คน").setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName("report")
        .setDescription("รายงานรวมแบบไม่ระบุตัวตน")
        .addIntegerOption((o) => o.setName("days").setDescription("ย้อนหลังกี่วัน (ค่าเริ่มต้น 14)").setMinValue(1).setMaxValue(365))
    )
    .addSubcommand((s) => s.setName("data").setDescription("คำขอแก้ไขหรือลบข้อมูล"))
    .addSubcommand((s) =>
      s
        .setName("season")
        .setDescription("ตั้งหรือแก้ฤดูกาล (แก้: ใส่แค่ชื่อกับค่าที่จะเปลี่ยน ค่าที่เว้นไว้คงเดิม)")
        .addStringOption((o) => o.setName("name").setDescription("ชื่อฤดูกาล").setRequired(true).setMaxLength(80))
        // Optional: on an edit a left-out option keeps its stored value. A new season needs all three dates.
        .addStringOption((o) => o.setName("starts").setDescription("เริ่ม YYYY-MM-DD (ซีซันใหม่ต้องใส่)"))
        .addStringOption((o) => o.setName("ends").setDescription("จบ YYYY-MM-DD (ซีซันใหม่ต้องใส่)"))
        .addStringOption((o) => o.setName("demo_day").setDescription("Demo Day YYYY-MM-DD (ซีซันใหม่ต้องใส่)"))
        .addIntegerOption((o) => o.setName("table_bar").setDescription("กี่ขั้นได้โต๊ะโชว์งาน (ค่าเริ่มต้น 2)").setMinValue(1).setMaxValue(7))
        .addIntegerOption((o) => o.setName("stage_bar").setDescription("กี่ขั้นได้ขึ้นเวที (ค่าเริ่มต้น 3)").setMinValue(1).setMaxValue(7))
        .addIntegerOption((o) => o.setName("goal_milestone").setDescription("เป้าทั้งเกาะ: ขั้นที่ (1 ถึง 7)").setMinValue(1).setMaxValue(7))
        .addIntegerOption((o) => o.setName("goal_target").setDescription("เป้าทั้งเกาะ: กี่ต้น").setMinValue(1))
        .addStringOption((o) => o.setName("goal_deadline").setDescription("เป้าทั้งเกาะ: ภายใน YYYY-MM-DD"))
        .addStringOption((o) => o.setName("goal_unlock").setDescription("ถึงเป้าแล้วทุกคนได้อะไร").setMaxLength(300))
        .addBooleanOption((o) => o.setName("activate").setDescription("เปิดใช้ฤดูกาลนี้เลย"))
        .addBooleanOption((o) => o.setName("clear_goal").setDescription("ลบเป้าทั้งเกาะ (ห้ามใส่ค่าเป้าอื่นพร้อมกัน)"))
        .addIntegerOption((o) =>
          o.setName("surprise_cap").setDescription("คำชมแบบเซอร์ไพรส์ได้กี่ครั้งต่อคนต่อซีซัน (ค่าเริ่มต้น 1, 0 = ปิด)").setMinValue(0).setMaxValue(20)
        )
    )
    .addSubcommand((s) =>
      s
        .setName("recognize")
        .setDescription("รางวัลตามหมวดใน Demo Day หรือคำชมแบบเซอร์ไพรส์ (มีเหตุผล)")
        .addUserOption((o) => o.setName("user").setDescription("คน").setRequired(true))
        .addIntegerOption((o) => o.setName("amount").setDescription("เหรียญ 0 ถึง 200 (0 = คำชมอย่างเดียว)").setRequired(true).setMinValue(0).setMaxValue(200))
        .addStringOption((o) => o.setName("category").setDescription("หมวด เช่น บทเรียนดีที่สุดจากการทดสอบที่ล้ม").setMaxLength(80))
    );

  return [start, island, project, squad, work, help, celebrate, inbox, coins, rewards, settings, data, review, fulfill, admin].map(
    (c) => c.toJSON()
  );
}

const RETIRED_COMMANDS = ["quest", "progress"];

/**
 * Creates or updates each command in the SHIFT server. One POST per command
 * upserts it by name and leaves other commands in the guild alone.
 */
export async function registerQuestCommands(token: string, guildId: string): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(token);
  const application = (await rest.get(Routes.oauth2CurrentApplication())) as { id: string };
  const commands = questCommands();
  for (const command of commands) {
    await rest.post(Routes.applicationGuildCommands(application.id, guildId), { body: command });
  }
  // Commands this module used to register; students now reach them through /island.
  const existing = (await rest.get(Routes.applicationGuildCommands(application.id, guildId))) as { id: string; name: string }[];
  for (const old of existing.filter((c) => RETIRED_COMMANDS.includes(c.name))) {
    await rest.delete(Routes.applicationGuildCommand(application.id, guildId, old.id));
  }
  console.log(`[shift-quests] registered ${commands.length} command(s) to guild ${guildId}`);
}
