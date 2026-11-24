import {
  AMOUNT_PRESETS,
  NEEDS_NEXT_STEP,
  STAGE_LABEL,
  type PipelineElement,
  type PipelineItem,
  type PipelineKind,
  type PipelineUpdateInput,
} from "@/lib/hackathon/elemental/pipeline";
import type { Owner } from "@/lib/hackathon/elemental/targets";

/** The edit sheet's form state and how it turns into a patch. Pure, so it is tested. */

export type AmountChoice = "none" | "other" | `${(typeof AMOUNT_PRESETS)[number]}`;

export type Draft = {
  kind: PipelineKind;
  name: string;
  organisation: string;
  element: PipelineElement | "none";
  owner: Owner | null;
  amount_choice: AmountChoice;
  amount_other: string;
  in_kind: boolean;
  why_fit: string;
  reach: string;
  next_step: string;
  next_step_due: string;
  notes: string;
};

export function toDraft(item: PipelineItem): Draft {
  const preset = (AMOUNT_PRESETS as readonly number[]).includes(item.amount_thb ?? -1);
  return {
    kind: item.kind,
    name: item.name,
    organisation: item.organisation ?? "",
    element: item.element ?? "none",
    owner: (item.owner as Owner | null) ?? null,
    amount_choice: item.amount_thb == null ? "none" : preset ? (String(item.amount_thb) as AmountChoice) : "other",
    amount_other: item.amount_thb != null && !preset ? String(item.amount_thb) : "",
    in_kind: item.in_kind,
    why_fit: item.why_fit ?? "",
    reach: item.reach ?? "",
    next_step: item.next_step ?? "",
    next_step_due: item.next_step_due ?? "",
    notes: item.notes ?? "",
  };
}

/** Only the fields that changed, in API shape. */
export function diff(item: PipelineItem, d: Draft): PipelineUpdateInput | { error: string } {
  const patch: Record<string, unknown> = {};
  const text = (k: keyof Draft & keyof PipelineItem) => {
    const v = (d[k] as string).trim();
    if (v !== ((item[k] as string | null) ?? "")) patch[k] = v || null;
  };
  if (d.kind !== item.kind) patch.kind = d.kind;
  if (d.name.trim() !== item.name) {
    if (!d.name.trim()) return { error: "Name is required" };
    patch.name = d.name.trim();
  }
  text("organisation");
  if (d.owner !== item.owner) patch.owner = d.owner;
  text("why_fit");
  text("reach");
  text("next_step");
  text("next_step_due");
  text("notes");
  const element = d.element === "none" ? null : d.element;
  if (element !== item.element) patch.element = element;
  let amount: number | null = null;
  if (d.amount_choice === "other") {
    const raw = d.amount_other.replace(/[,\s฿]/g, "");
    amount = raw === "" ? null : Number(raw);
    if (amount !== null && (!Number.isInteger(amount) || amount < 0)) return { error: "Amount is whole baht, 0 or more" };
  } else if (d.amount_choice !== "none") {
    amount = Number(d.amount_choice);
  }
  if (amount !== item.amount_thb) patch.amount_thb = amount;
  if (d.in_kind !== item.in_kind) patch.in_kind = d.in_kind;
  // An open conversation keeps its plan: the next step can change, not vanish.
  if (NEEDS_NEXT_STEP.includes(item.stage) && (!d.next_step.trim() || !d.next_step_due.trim())) {
    return { error: `${STAGE_LABEL[item.stage]} needs a next step and a date` };
  }
  return patch as PipelineUpdateInput;
}

/** Key of the card's plan: changes when a move or a touch saves a new stage, next step or date. */
export function planKey(item: Pick<PipelineItem, "stage" | "next_step" | "next_step_due">): string {
  return `${item.stage}\u0000${item.next_step ?? ""}\u0000${item.next_step_due ?? ""}`;
}

/**
 * The draft with its next step and date taken from the card, after a move
 * or a touch answered from inside the sheet saved new ones. Other fields
 * keep what the person is typing.
 */
export function withPlanFrom(draft: Draft, item: Pick<PipelineItem, "next_step" | "next_step_due">): Draft {
  return { ...draft, next_step: item.next_step ?? "", next_step_due: item.next_step_due ?? "" };
}
