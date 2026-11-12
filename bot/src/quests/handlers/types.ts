import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  MessageComponentInteraction,
  ModalSubmitInteraction,
} from "discord.js";

import type { Ctx } from "../context";

export type ActionInteraction = MessageComponentInteraction | ModalSubmitInteraction;

/** A slash command, keyed "name" or "name sub". */
export type CommandHandler = (i: ChatInputCommandInteraction, ctx: Ctx) => Promise<void>;

/** A button, select menu or modal, keyed by the action in its custom ID. */
export type ActionHandler = (i: ActionInteraction, ctx: Ctx, args: string[]) => Promise<void>;

export type AutocompleteHandler = (i: AutocompleteInteraction, ctx: Ctx) => Promise<void>;

export interface HandlerSet {
  commands?: Record<string, CommandHandler>;
  actions?: Record<string, ActionHandler>;
  autocomplete?: Record<string, AutocompleteHandler>;
}

/** The selected value of a string select, or the first argument of a button. */
export function picked(i: ActionInteraction, args: string[]): string | undefined {
  if (i.isStringSelectMenu()) return i.values[0];
  return args[0];
}
