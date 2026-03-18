import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const AI_API_URL = 'https://ai.passionseed.org/v1/chat/completions';
const AI_API_KEY = 'AIAngpao';

/**
 * POST /api/pathlab/ai-chat/test
 * Test AI chat for admins (doesn't save to database)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin/instructor
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'instructor']);

    if (!roles?.length) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { system_prompt, objective, completion_criteria, messages } = body;

    if (!system_prompt) {
      return NextResponse.json(
        { error: 'system_prompt is required' },
        { status: 400 }
      );
    }

    // Build system prompt with objective
    let enhancedSystemPrompt = system_prompt;
    if (objective) {
      enhancedSystemPrompt += `\n\n**Conversation Objective:** ${objective}`;
      if (completion_criteria) {
        enhancedSystemPrompt += `\n\n**Completion Criteria:**\n${completion_criteria}`;
      }
      enhancedSystemPrompt += `\n\nGuide the conversation towards achieving this objective. When you believe the objective has been met, naturally conclude the conversation.`;
    }

    // Build messages array for AI
    const aiMessages = [
      {
        role: 'system',
        content: enhancedSystemPrompt,
      },
      ...messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // If no user messages yet, ask AI to introduce itself
    if (messages.length === 0) {
      aiMessages.push({
        role: 'user',
        content: 'Please introduce yourself and explain how you can help.',
      });
    }

    // Call AI API
    const aiResponse = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'passion-6',
        messages: aiMessages,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('AI API request failed');
    }

    const aiData = await aiResponse.json();

    const assistantMessage =
      aiData.choices?.[0]?.message?.content || 'No response from AI';

    // Analyze progress if objective is provided
    let completionPercentage = 0;
    let isCompleted = false;

    if (objective) {
      const allMessages = [
        ...aiMessages,
        { role: 'assistant', content: assistantMessage },
      ];
      const progressAnalysis = await analyzeProgress(
        allMessages,
        objective,
        completion_criteria
      );
      completionPercentage = progressAnalysis.percentage;
      isCompleted = progressAnalysis.isComplete;
    }

    return NextResponse.json({
      message: assistantMessage,
      completion_percentage: completionPercentage,
      is_completed: isCompleted,
    });
  } catch (error) {
    console.error('Test AI chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Analyze conversation progress towards objective
 * Uses AI to determine completion percentage
 */
async function analyzeProgress(
  messages: Array<{ role: string; content: string }>,
  objective: string,
  completionCriteria?: string
): Promise<{ percentage: number; isComplete: boolean }> {
  try {
    const analysisPrompt = `Analyze this conversation and determine progress towards the objective.

**Objective:** ${objective}

${completionCriteria ? `**Completion Criteria:**\n${completionCriteria}` : ''}

**Conversation:**
${messages
  .filter((m) => m.role !== 'system')
  .map((m) => `${m.role}: ${m.content}`)
  .join('\n\n')}

Based on the conversation, provide:
1. Completion percentage (0-100)
2. Whether the objective is fully met (true/false)

Respond ONLY with valid JSON in this exact format:
{"percentage": 0, "isComplete": false}`;

    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'passion-6',
        messages: [
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('Progress analysis failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      percentage: Math.min(100, Math.max(0, parseInt(analysis.percentage) || 0)),
      isComplete: analysis.isComplete === true,
    };
  } catch (error) {
    console.error('Progress analysis error:', error);
    // Default: increment by 10% per exchange, max 90% until declared complete
    const messageCount = messages.filter((m) => m.role === 'user').length;
    return {
      percentage: Math.min(90, messageCount * 10),
      isComplete: false,
    };
  }
}
