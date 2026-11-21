import {
  ApplicationCommandType,
  InteractionContextType,
  PermissionFlagsBits,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";

import type { ActionHandler, AutocompleteHandler, CommandHandler, ElementalFeature } from "./context";
import { feature as join } from "./features/join";
import { feature as teams } from "./features/teams";
import { feature as teamops } from "./features/teamops";
import { feature as canvas } from "./features/canvas";
import { feature as tester } from "./features/tester";
import { feature as staff } from "./features/staff";
import { feature as schedule } from "./features/schedule";
import { feature as bell } from "./features/bell";
import { feature as exportFeature } from "./features/export";
import { feature as handin } from "./features/handin";
import { feature as powerup } from "./features/powerup";
import { feature as report } from "./features/report";

/**
 * The fixed list of Elemental features. Each later ticket replaces its own
 * features/<name>.ts (keeping `export const feature`); nobody edits this
 * file or index.ts again, so parallel tickets never conflict here.
 */
export const FEATURES: readonly ElementalFeature[] = [
  join,
  teams,
  teamops,
  canvas,
  tester,
  staff,
  schedule,
  bell,
  exportFeature,
  handin,
  powerup,
  report,
];

/** The one staff command every feature's staff tools hang off: /el <tool>. */
export const STAFF_COMMAND = "el";
/** Discord's cap on subcommands per command. */
export const MAX_SUBCOMMANDS = 25;

export interface Registry {
  features: readonly ElementalFeature[];
  /** JSON bodies to register, one POST each per guild. */
  commands: RESTPostAPIChatInputApplicationCommandsJSONBody[];
  commandHandlers: Map<string, CommandHandler>;
  actions: Map<string, ActionHandler>;
  autocomplete: Map<string, AutocompleteHandler>;
}

function mergeInto<T>(map: Map<string, T>, entries: Record<string, T> | undefined, kind: string, owner: string): void {
  for (const [key, handler] of Object.entries(entries ?? {})) {
    if (map.has(key)) throw new Error(`Duplicate elemental ${kind} "${key}" (in ${owner})`);
    map.set(key, handler);
  }
}

/**
 * Every command is guild-only: never usable in a DM with the bot, the
 * private exchange students must learn not to trust (bot/README.md).
 */
function guildOnly(body: RESTPostAPIChatInputApplicationCommandsJSONBody): RESTPostAPIChatInputApplicationCommandsJSONBody {
  return { ...body, type: ApplicationCommandType.ChatInput, contexts: [InteractionContextType.Guild] };
}

export function buildRegistry(features: readonly ElementalFeature[]): Registry {
  const commandHandlers = new Map<string, CommandHandler>();
  const actions = new Map<string, ActionHandler>();
  const autocomplete = new Map<string, AutocompleteHandler>();
  const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
  const names = new Set<string>();
  const subcommands: NonNullable<ElementalFeature["staffSubcommands"]> = [];
  const subNames = new Set<string>();
  const featureNames = new Set<string>();

  for (const feature of features) {
    if (featureNames.has(feature.name)) throw new Error(`Duplicate elemental feature "${feature.name}"`);
    featureNames.add(feature.name);
    for (const command of feature.commands ?? []) {
      if (command.name === STAFF_COMMAND) {
        throw new Error(`"${STAFF_COMMAND}" is built from staffSubcommands (in ${feature.name})`);
      }
      if (names.has(command.name)) throw new Error(`Duplicate elemental command "/${command.name}" (in ${feature.name})`);
      names.add(command.name);
      commands.push(guildOnly(command));
    }
    for (const sub of feature.staffSubcommands ?? []) {
      if (subNames.has(sub.name)) throw new Error(`Duplicate staff tool "/el ${sub.name}" (in ${feature.name})`);
      subNames.add(sub.name);
      subcommands.push(sub);
    }
    mergeInto(commandHandlers, feature.commandHandlers, "command handler", feature.name);
    mergeInto(actions, feature.actions, "action", feature.name);
    mergeInto(autocomplete, feature.autocomplete, "autocomplete", feature.name);
  }

  if (subcommands.length > MAX_SUBCOMMANDS) {
    throw new Error(`/el has ${subcommands.length} tools; Discord allows ${MAX_SUBCOMMANDS}`);
  }
  if (subcommands.length > 0) {
    commands.push(
      guildOnly({
        name: STAFF_COMMAND,
        // [TH-REVIEW] staff command description.
        description: "เครื่องมือทีมงาน Elemental",
        // Hidden from members without Manage Server until a server admin
        // shows it to Helper, Mentor and Safety (Server Settings > Integrations).
        // Visibility is convenience only: every tool checks roles itself.
        default_member_permissions: PermissionFlagsBits.ManageGuild.toString(),
        options: subcommands,
      })
    );
  }

  return { features, commands, commandHandlers, actions, autocomplete };
}

let built: Registry | null = null;

/** The registry of the fixed feature list, built once. */
export function registry(): Registry {
  built ??= buildRegistry(FEATURES);
  return built;
}
