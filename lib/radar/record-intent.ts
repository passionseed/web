/**
 * "สนใจสายนี้" for a career: one radar_path_intents row (with the visit id) and,
 * for field-scoped intents, the canonical My Path intent. Extracted from the
 * deck's CtaCard handler so the code-guide outro and the deck share one path.
 * Browser only; never opens a chat or a LINE QR.
 */
import {
  recordRadarMyPathIntent,
  recordRadarPathIntent,
  routeRadarCardIntent,
  type RadarIntentScope,
} from "@/lib/supabase/radar";

export interface FieldIntentInput {
  fieldSlug: string;
  /** radar_fields.id when known (the deck); code guides have none and send null. */
  fieldId?: string | null;
  pathSlug: string;
  scope?: RadarIntentScope;
  buttonLabel?: string;
  /** Stored as button_label when `buttonLabel` is empty. */
  fallbackLabel?: string;
  visitId: string | null;
}

export interface FieldIntentDeps {
  recordPathIntent: typeof recordRadarPathIntent;
  recordMyPathIntent: typeof recordRadarMyPathIntent;
  route: typeof routeRadarCardIntent;
}

const DEFAULT_DEPS: FieldIntentDeps = {
  recordPathIntent: recordRadarPathIntent,
  recordMyPathIntent: recordRadarMyPathIntent,
  route: routeRadarCardIntent,
};

/** Returns false (and records nothing) without a career slug. */
export function recordFieldIntent(input: FieldIntentInput, deps: FieldIntentDeps = DEFAULT_DEPS): boolean {
  const { fieldSlug, fieldId, pathSlug, scope, buttonLabel, fallbackLabel, visitId } = input;
  if (!fieldSlug) return false;
  deps.route({
    scope,
    buttonLabel,
    recordAnalytics() {
      void Promise.resolve(
        deps.recordPathIntent({
          fieldSlug,
          fieldId: fieldId ?? undefined,
          pathSlug,
          buttonLabel: buttonLabel || fallbackLabel || undefined,
          visitId,
        })
      ).catch(() => undefined);
    },
    recordCanonical(intent) {
      deps.recordMyPathIntent({ careerSlug: fieldSlug, intent });
    },
  });
  return true;
}
