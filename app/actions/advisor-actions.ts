"use server";

import { AssessmentAnswers } from "@/types/direction-finder";
import {
    conductDirectionConversation as conductLogic,
} from "@/lib/ai/conversationEngine";
import {
    generateDirectionProfile as generateLogic,
    generateDirectionProfileCore as generateCoreLogic,
    generateDirectionProfileDetails as generateDetailsLogic,
} from "@/lib/ai/directionProfileEngine";
import { DirectionFinderResult } from "@/types/direction-finder";
import { createClient } from "@/utils/supabase/server";
import { resolveDirectionModel } from "@/lib/ai/modelResolver";

export async function conductDirectionConversation(
    history: { role: 'user' | 'assistant'; content: string }[],
    answers: AssessmentAnswers,
    modelName?: string,
    language: 'en' | 'th' = 'en'
) {
    return conductLogic(history, answers, modelName, language);
}

export async function generateDirectionProfile(
    history: { role: 'user' | 'assistant'; content: string }[],
    answers: AssessmentAnswers,
    modelName?: string,
    language: 'en' | 'th' = 'en'
) {
    return generateLogic(history, answers, modelName, language);
}

export async function generateDirectionProfileCore(
    history: { role: 'user' | 'assistant'; content: string }[],
    answers: AssessmentAnswers,
    modelName?: string,
    language: 'en' | 'th' = 'en'
) {
    return generateCoreLogic(history, answers, modelName, language);
}

export async function generateDirectionProfileDetails(
    coreResult: Partial<DirectionFinderResult>,
    answers: AssessmentAnswers,
    modelName?: string,
    language: 'en' | 'th' = 'en'
) {
    return generateDetailsLogic(coreResult, answers, modelName, language);
}

export async function resolveDirectionModelForSession(
    explicitModel?: string,
): Promise<string> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const allowExplicitOverride =
        process.env.DIRECTION_FINDER_ALLOW_MODEL_OVERRIDE === "true" ||
        process.env.NODE_ENV !== "production";

    return resolveDirectionModel({
        userId: user?.id,
        explicitModel,
        allowExplicitOverride,
    });
}
