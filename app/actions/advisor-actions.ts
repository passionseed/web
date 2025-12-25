"use server";

import { AssessmentAnswers } from "@/types/direction-finder";
import {
    conductDirectionConversation as conductLogic,
    generateDirectionProfile as generateLogic,
    generateDirectionProfileCore as generateCoreLogic,
    generateDirectionProfileDetails as generateDetailsLogic,
} from "@/lib/ai/education-advisor";
import { DirectionFinderResult } from "@/types/direction-finder";

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
