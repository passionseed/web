import {
  ChannelType,
  MessageFlags,
  REST,
  Routes,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { BotEnv } from "./env";
import { fetchStats, type DiscordUserStats } from "./db";

const HUB_URL = "https://passionseed.co/projectseed/hub";

export const COMMANDS = [
  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("ดูสถิติของคุณใน ProjectSeed")
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("ดูของคนอื่น (เว้นว่างไว้ = ของคุณเอง)")
        .setRequired(false)
    )
    // Slash commands are not DMs, but allowing this one in a DM would make a
    // private exchange with the bot feel normal — the exact signal §3 protects.
    .setDMPermission(false)
    .toJSON(),
];

export async function registerCommands(env: BotEnv): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(env.discordToken);
  const application = (await rest.get(Routes.oauth2CurrentApplication())) as {
    id: string;
  };

  await rest.put(
    Routes.applicationGuildCommands(application.id, env.guildId),
    { body: COMMANDS }
  );

  console.log(`Registered ${COMMANDS.length} command(s) to guild ${env.guildId}`);
}

/** The two REST calls an upsert needs, so tests pass a fake and assert no PUT is ever made. */
export interface CommandRest {
  get(route: `/${string}`): Promise<unknown>;
  post(route: `/${string}`, options: { body: unknown }): Promise<unknown>;
}

/**
 * Creates or updates each command by name: one POST per command per guild.
 * Never a PUT, which replaces the guild's whole list and would delete every
 * command not in it (see registerCommands above). Commands this call does not
 * name are left alone. Returns how many POSTs were made.
 */
export async function upsertGuildCommands(
  rest: CommandRest,
  guildIds: readonly string[],
  commands: readonly RESTPostAPIChatInputApplicationCommandsJSONBody[],
  label: string
): Promise<number> {
  if (commands.length === 0) {
    console.log(`[${label}] no slash commands to register`);
    return 0;
  }
  const application = (await rest.get(Routes.oauth2CurrentApplication())) as { id: string };
  let posts = 0;
  for (const guildId of guildIds) {
    for (const command of commands) {
      await rest.post(Routes.applicationGuildCommands(application.id, guildId), { body: command });
      posts += 1;
    }
    console.log(`[${label}] registered ${commands.length} command(s) to guild ${guildId}; other commands left alone`);
  }
  return posts;
}

function formatHours(seconds: number): string {
  if (!seconds || seconds <= 0) return "0 ชั่วโมง";
  const hours = Math.floor(seconds / 3600);
  if (hours > 0) return `${hours} ชั่วโมง`;
  return `${Math.max(1, Math.round(seconds / 60))} นาที`;
}

function renderStats(stats: DiscordUserStats, forSelf: boolean): string {
  const lines = [
    `**${stats.display_name ?? "ไม่ระบุชื่อ"}**`,
    stats.project_title ? `โปรเจกต์: ${stats.project_title}` : "ยังไม่ได้เลือกโปรเจกต์",
  ];

  if (stats.tags.length > 0) {
    lines.push(stats.tags.map((tag) => `\`#${tag}\``).join(" "));
  }

  lines.push(
    "",
    `ชั่วโมงในห้อง: **${formatHours(stats.recorded_seconds)}** (${stats.session_count} ครั้ง)`,
    `ตรงตามที่จอง: **${stats.kept_slot_count}** จาก ${stats.planned_slots} ช่วง`
  );

  if (stats.last_seen_at) {
    const seen = Math.floor(new Date(stats.last_seen_at).getTime() / 1000);
    lines.push(`เข้าห้องล่าสุด: <t:${seen}:R>`);
  }

  if (forSelf) lines.push("", HUB_URL);

  return lines.join("\n");
}

export function registerInteractions(
  client: Client,
  db: SupabaseClient,
  cohortId: string
): void {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "stats") return;
    if (interaction.channel?.type === ChannelType.DM) return;

    const command = interaction as ChatInputCommandInteraction;
    const target = command.options.getUser("member") ?? command.user;
    const forSelf = target.id === command.user.id;

    // Ephemeral: someone else's hours are theirs to share, and a public reply
    // would turn `/stats @someone` into a way to put a quiet week on display.
    await command.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const stats = await fetchStats(db, cohortId, target.id);

      if (!stats) {
        await command.editReply(
          forSelf
            ? `ยังไม่พบบัญชีของคุณในรุ่นนี้ — เชื่อม Discord ที่ ${HUB_URL} ก่อน`
            : "ยังไม่พบบัญชีของคนนี้ในรุ่นนี้"
        );
        return;
      }

      await command.editReply(renderStats(stats, forSelf));
    } catch (error) {
      console.error("[stats] command failed:", error);
      await command.editReply("ดึงสถิติไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  });
}
