import {
  InteractionContextType,
  REST,
  Routes,
  SlashCommandBuilder,
  type SlashCommandStringOption,
} from "discord.js";

export const OPS_COMMAND = "ops";

function operationOption(option: SlashCommandStringOption): SlashCommandStringOption {
  return option.setName("operation").setDescription("The operation").setRequired(true).setAutocomplete(true);
}

/** /ops and its five subcommands. Staff only, checked on every use (handlers.ts). */
export function opsCommand() {
  return (
    new SlashCommandBuilder()
      .setName(OPS_COMMAND)
      .setDescription("The hackathon operations board (staff)")
      // Server only: never in DMs or group DMs.
      .setContexts(InteractionContextType.Guild)
      .addSubcommand((sub) => sub.setName("board").setDescription("Every operation: owner, deadline, status and steps"))
      .addSubcommand((sub) =>
        sub.setName("show").setDescription("One operation and its steps").addStringOption(operationOption)
      )
      .addSubcommand((sub) =>
        sub.setName("claim").setDescription("Make yourself the owner").addStringOption(operationOption)
      )
      .addSubcommand((sub) =>
        sub
          .setName("done")
          .setDescription("Tick a step")
          .addStringOption(operationOption)
          .addStringOption((option) =>
            option.setName("step").setDescription("The step").setRequired(true).setAutocomplete(true)
          )
          .addBooleanOption((option) => option.setName("undo").setDescription("Untick it instead"))
      )
      .addSubcommand((sub) =>
        sub
          .setName("status")
          .setDescription("Set the status line")
          .addStringOption(operationOption)
          .addStringOption((option) =>
            option.setName("text").setDescription("The new status").setRequired(true).setMaxLength(300)
          )
      )
      .toJSON()
  );
}

/** The REST calls registration makes, so tests can check none of them wipes or deletes. */
export type RegisterRest = Pick<REST, "get" | "post">;

/**
 * Creates or updates /ops in one server, and nothing else. A POST to the
 * guild commands route upserts one command by name, so commands other modules
 * registered there (projectseed's /stats, the SHIFT High commands) stay as
 * they are. Never a PUT, which would replace the server's whole list, and
 * never a DELETE.
 */
export async function registerOpsCommands(
  token: string,
  guildId: string,
  rest: RegisterRest = new REST({ version: "10" }).setToken(token)
): Promise<void> {
  const application = (await rest.get(Routes.oauth2CurrentApplication())) as { id: string };
  await rest.post(Routes.applicationGuildCommands(application.id, guildId), { body: opsCommand() });
  console.log(`[hackathon-ops] registered /${OPS_COMMAND} to guild ${guildId}; other commands left alone`);
}
