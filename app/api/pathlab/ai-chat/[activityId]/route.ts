import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { AIChatMetadata } from '@/types/pathlab-content';

const AI_API_URL = 'https://ai.passionseed.org/v1/chat/completions';
const AI_API_KEY = 'AIAngpao';

/**
 * POST /api/pathlab/ai-chat/[activityId]
 * Send message in AI chat and track progress
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const { activityId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, progressId } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!progressId) {
      return NextResponse.json(
        { error: 'Progress ID is required' },
        { status: 400 }
      );
    }

    // Fetch activity with content metadata
    const { data: activity } = await supabase
      .from('path_activities')
      .select('*, path_content(*)')
      .eq('id', activityId)
      .single();

    if (!activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Find AI chat content
    const aiChatContent = activity.path_content?.find(
      (c: any) => c.content_type === 'ai_chat'
    );

    if (!aiChatContent) {
      return NextResponse.json(
        { error: 'AI chat not configured for this activity' },
        { status: 400 }
      );
    }

    const metadata = aiChatContent.metadata as AIChatMetadata;

    if (!metadata.system_prompt || !metadata.objective) {
      return NextResponse.json(
        { error: 'AI chat configuration is incomplete' },
        { status: 400 }
      );
    }

    // Get or create chat session
    let { data: session } = await supabase
      .from('path_ai_chat_sessions')
      .select('*')
      .eq('progress_id', progressId)
      .maybeSingle();

    if (!session) {
      const { data: newSession, error: createError } = await supabase
        .from('path_ai_chat_sessions')
        .insert({
          progress_id: progressId,
          activity_id: activityId,
          user_id: user.id,
          objective: metadata.objective,
          completion_percentage: 0,
        })
        .select('*')
        .single();

      if (createError) {
        console.error('Error creating session:', createError);
        return NextResponse.json(
          { error: 'Failed to create chat session' },
          { status: 500 }
        );
      }

      session = newSession;
    }

    // Fetch conversation history
    const { data: messageHistory } = await supabase
      .from('path_ai_chat_messages')
      .select('role, content')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });

    // Save user message
    await supabase.from('path_ai_chat_messages').insert({
      session_id: session.id,
      role: 'user',
      content: message,
    });

    // Build AI messages
    const aiMessages = [
      {
        role: 'system',
        content: buildSystemPrompt(metadata),
      },
      ...(messageHistory || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    // Call AI API
    const aiResponse = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: metadata.model || 'passion-6',
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

    // Save assistant message
    await supabase.from('path_ai_chat_messages').insert({
      session_id: session.id,
      role: 'assistant',
      content: assistantMessage,
    });

    // Analyze completion progress
    const progressAnalysis = await analyzeProgress(
      [...aiMessages, { role: 'assistant', content: assistantMessage }],
      metadata.objective,
      metadata.completion_criteria
    );

    // Update session with progress
    const { data: updatedSession } = await supabase
      .from('path_ai_chat_sessions')
      .update({
        completion_percentage: progressAnalysis.percentage,
        is_completed: progressAnalysis.isComplete,
        completed_at: progressAnalysis.isComplete ? new Date().toISOString() : null,
      })
      .eq('id', session.id)
      .select('*')
      .single();

    // If completed, mark activity progress as completed
    if (progressAnalysis.isComplete) {
      await supabase
        .from('path_activity_progress')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', progressId);
    }

    return NextResponse.json({
      message: assistantMessage,
      completion_percentage: progressAnalysis.percentage,
      is_completed: progressAnalysis.isComplete,
      session_id: session.id,
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Build system prompt with objective tracking
 */
function buildSystemPrompt(metadata: AIChatMetadata): string {
  let prompt = metadata.system_prompt;

  prompt += `\n\n**Conversation Objective:** ${metadata.objective}`;

  if (metadata.completion_criteria) {
    prompt += `\n\n**Completion Criteria:**\n${metadata.completion_criteria}`;
  }

  prompt += `\n\nGuide the conversation towards achieving this objective. When you believe the objective has been met, naturally conclude the conversation.`;

  return prompt;
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

/**
 * GET /api/pathlab/ai-chat/[activityId]
 * Get chat session and message history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const { activityId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const progressId = searchParams.get('progressId');

    if (!progressId) {
      return NextResponse.json(
        { error: 'Progress ID is required' },
        { status: 400 }
      );
    }

    // Get session
    const { data: session } = await supabase
      .from('path_ai_chat_sessions')
      .select('*')
      .eq('progress_id', progressId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({
        session: null,
        messages: [],
      });
    }

    // Get messages
    const { data: messages } = await supabase
      .from('path_ai_chat_messages')
      .select('id, role, content, created_at')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      session,
      messages: messages || [],
    });
  } catch (error) {
    console.error('Get chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
