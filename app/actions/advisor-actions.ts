"use server";

import { AssessmentAnswers } from "@/types/direction-finder";
import {
    conductDirectionConversation as conductLogic,
} from "@/lib/ai/conversationEngine";
import {
    generateDirectionProfile as generateLogic,
    generateDirectionProfileCore as generateCoreLogic,
    generateDirectionProfileDetails as generateDetailsLogic,
    generatePrograms as generateProgramsLogic,
    generateCommitments as generateCommitmentsLogic,
    generateVectorDetails as generateVectorDetailsLogic,
} from "@/lib/ai/directionProfileEngine";
import { DirectionFinderResult } from "@/types/direction-finder";
import { createClient } from "@/utils/supabase/server";

export async function conductDirectionConversation(
    history: { role: 'user' | 'assistant'; content: string }[],
    answers: AssessmentAnswers,
    modelName?: string,
    language: 'en' | 'th' = 'en'
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    return conductLogic(history, answers, modelName, language);
}

export async function generateDirectionProfile(
    history: { role: 'user' | 'assistant'; content: string }[],
    answers: AssessmentAnswers,
    modelName?: string,
    language: 'en' | 'th' = 'en'
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    return generateLogic(history, answers, modelName, language);
}

export async function generateDirectionProfileCore(
    history: { role: 'user' | 'assistant'; content: string }[],
    answers: AssessmentAnswers,
    modelName?: string,
    language: 'en' | 'th' = 'en'
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    return generateCoreLogic(history, answers, modelName, language);
}

export async function generateDirectionProfileDetails(
    coreResult: Partial<DirectionFinderResult>,
    answers: AssessmentAnswers,
    modelName?: string,
    language: 'en' | 'th' = 'en'
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    return generateDetailsLogic(coreResult, answers, modelName, language);
}

export async function generatePrograms(
    coreResult: Partial<DirectionFinderResult>,
    answers: AssessmentAnswers,
    modelName?: string,
    language: 'en' | 'th' = 'en'
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    return generateProgramsLogic(coreResult, answers, modelName, language);
}

export async function generateCommitments(
    coreResult: Partial<DirectionFinderResult>,
    answers: AssessmentAnswers,
    modelName?: string,
    language: 'en' | 'th' = 'en'
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    return generateCommitmentsLogic(coreResult, answers, modelName, language);
}

export async function generateVectorDetails(
    vector: { name: string; industry: string; role: string; specialization: string },
    answers: AssessmentAnswers,
    modelName?: string,
    language: 'en' | 'th' = 'en'
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    return generateVectorDetailsLogic(vector, answers, modelName, language);
}
