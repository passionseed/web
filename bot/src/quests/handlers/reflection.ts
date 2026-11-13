/** Shared private reflection form and confirmation for the campfire and island. */
import { T } from "../copy";
import { cid } from "../ids";
import { LEARNED_MIN, R } from "../rounds-copy";
import { ButtonStyle, button, buttonRows, modal, type View } from "../ui";

/** The reflection form; args ride in the custom id (the campfire's captured session). */
export function reflectionModal(action: string, title: string, ...args: (string | null)[]) {
  return modal(cid(action, ...args), title, [
    { kind: "text", id: "learned", label: R.closeLearned, description: R.closeLearnedHint, long: true, required: true, min: LEARNED_MIN, max: 1000 },
    { kind: "text", id: "stuck", label: R.closeStuck, description: R.closeStuckHint, long: true, required: false, max: 1000 },
  ]);
}

export function reflectionSavedView(id: string, stuck: string | null): View {
  return {
    tone: "success",
    title: R.closedTitle,
    blocks: [
      { kind: "text", text: R.closed },
      { kind: "subtext", text: R.closedFine },
    ],
    rows: stuck ? buttonRows([button(cid("prog_help", id), T.btnSendBlocker, ButtonStyle.Primary)]) : undefined,
  };
}
