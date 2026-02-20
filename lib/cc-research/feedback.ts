import type { CcICPWeights, CcFeedbackEvent } from "@/lib/cc-research/types";

export interface CcLearningResult {
  updatedWeights: CcICPWeights;
  weightDelta: Record<keyof CcICPWeights, number>;
  objectionFrequency: Record<string, number>;
  conversion: Record<string, { total: number; positive: number; blocked: number; noResponse: number; rate: number }>;
  notes: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeWeights(weights: CcICPWeights): CcICPWeights {
  const total =
    weights.studentScale +
    weights.advisorStaffing +
    weights.careerTransitionLanguage +
    weights.transferSignals +
    weights.easeOfContact;

  if (total <= 0) {
    return {
      studentScale: 25,
      advisorStaffing: 25,
      careerTransitionLanguage: 20,
      transferSignals: 15,
      easeOfContact: 15,
    };
  }

  return {
    studentScale: round2((weights.studentScale / total) * 100),
    advisorStaffing: round2((weights.advisorStaffing / total) * 100),
    careerTransitionLanguage: round2((weights.careerTransitionLanguage / total) * 100),
    transferSignals: round2((weights.transferSignals / total) * 100),
    easeOfContact: round2((weights.easeOfContact / total) * 100),
  };
}

function mapOutcomeToDimension(reason: string): keyof CcICPWeights | null {
  const normalized = reason.toLowerCase();

  if (normalized.includes("student") || normalized.includes("scale") || normalized.includes("tuition")) {
    return "studentScale";
  }

  if (normalized.includes("advisor") || normalized.includes("counsel") || normalized.includes("staff")) {
    return "advisorStaffing";
  }

  if (normalized.includes("career") || normalized.includes("transition")) {
    return "careerTransitionLanguage";
  }

  if (normalized.includes("transfer") || normalized.includes("pathway")) {
    return "transferSignals";
  }

  if (normalized.includes("email") || normalized.includes("linkedin") || normalized.includes("reply")) {
    return "easeOfContact";
  }

  return null;
}

function emptyConversionBucket() {
  return {
    total: 0,
    positive: 0,
    blocked: 0,
    noResponse: 0,
    rate: 0,
  };
}

export function learnFromFeedback(
  currentWeights: CcICPWeights,
  events: CcFeedbackEvent[],
): CcLearningResult {
  const delta: Record<keyof CcICPWeights, number> = {
    studentScale: 0,
    advisorStaffing: 0,
    careerTransitionLanguage: 0,
    transferSignals: 0,
    easeOfContact: 0,
  };

  const objectionFrequency: Record<string, number> = {};
  const conversion: Record<string, { total: number; positive: number; blocked: number; noResponse: number; rate: number }> = {};

  for (const event of events) {
    const segment = event.segmentKey || "default";
    const bucket = conversion[segment] || emptyConversionBucket();
    bucket.total += 1;

    const snapshot = event.scoreSnapshot || {};

    if (event.outcome === "completed" || event.outcome === "scheduled") {
      bucket.positive += 1;
      for (const [dimension, value] of Object.entries(snapshot) as Array<[
        keyof CcICPWeights,
        number,
      ]>) {
        if (value >= 70) {
          delta[dimension] += 0.9;
        } else if (value <= 40) {
          delta[dimension] -= 0.4;
        }
      }
      delta.studentScale += 0.2;
    }

    if (event.outcome === "declined" || event.outcome === "no_show") {
      bucket.blocked += 1;
      const reason = (event.objectionReason || "unknown").toLowerCase();
      objectionFrequency[reason] = (objectionFrequency[reason] || 0) + 1;

      const mappedDimension = mapOutcomeToDimension(reason);
      if (mappedDimension) {
        delta[mappedDimension] -= 1.0;
      } else {
        delta.studentScale -= 0.5;
        delta.advisorStaffing -= 0.5;
        delta.careerTransitionLanguage -= 0.5;
        delta.transferSignals -= 0.5;
        delta.easeOfContact -= 0.5;
      }
    }

    if (event.outcome === "no_response" || event.outcome === "replied") {
      // no_response does not progress to outcome conversion, replied is neutral holdback in this model
    }

    if (event.outcome === "replied") {
      bucket.positive += 1;
    }

    if (event.outcome === "disqualified") {
      bucket.noResponse += 1;
    }

    conversion[segment] = bucket;
  }

  for (const key of Object.keys(conversion)) {
    const bucket = conversion[key];
    bucket.rate = bucket.total ? round2((bucket.positive / bucket.total) * 100) : 0;
  }

  const normalized = normalizeWeights({
    studentScale: clamp(currentWeights.studentScale + delta.studentScale, 4, 55),
    advisorStaffing: clamp(currentWeights.advisorStaffing + delta.advisorStaffing, 4, 45),
    careerTransitionLanguage: clamp(
      currentWeights.careerTransitionLanguage + delta.careerTransitionLanguage,
      4,
      45,
    ),
    transferSignals: clamp(currentWeights.transferSignals + delta.transferSignals, 4, 35),
    easeOfContact: clamp(currentWeights.easeOfContact + delta.easeOfContact, 5, 30),
  });

  const weightDelta: Record<keyof CcICPWeights, number> = {
    studentScale: round2(normalized.studentScale - currentWeights.studentScale),
    advisorStaffing: round2(normalized.advisorStaffing - currentWeights.advisorStaffing),
    careerTransitionLanguage: round2(
      normalized.careerTransitionLanguage - currentWeights.careerTransitionLanguage,
    ),
    transferSignals: round2(normalized.transferSignals - currentWeights.transferSignals),
    easeOfContact: round2(normalized.easeOfContact - currentWeights.easeOfContact),
  };

  const notes: string[] = [];

  const topObjection = Object.entries(objectionFrequency).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (topObjection) {
    notes.push(`Top objection theme: ${topObjection}`);
  }

  const winner = (Object.entries(weightDelta) as Array<[keyof CcICPWeights, number]>).sort(
    (a, b) => b[1] - a[1],
  )[0];
  if (winner) {
    notes.push(`Primary weight shift: ${winner[0]} ${winner[1] >= 0 ? "+" : ""}${winner[1]}`);
  }

  return {
    updatedWeights: normalized,
    weightDelta,
    objectionFrequency,
    conversion,
    notes,
  };
}
