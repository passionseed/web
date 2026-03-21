import { NextRequest, NextResponse } from 'next/server';

import type { CollectedData, OnboardingStep } from '@/types/onboarding';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

const VALID_STEPS: OnboardingStep[] = [
  'welcome',
  'interest',
  'assessment',
  'influence',
  'results',
  'account',
];

interface StateRequestBody {
  step?: string;
  collected_data?: CollectedData;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as StateRequestBody | null;
  const step = body?.step;
  const collectedData = body?.collected_data;

  if (!step || !VALID_STEPS.includes(step as OnboardingStep)) {
    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  }

  if (!collectedData || typeof collectedData !== 'object' || Array.isArray(collectedData)) {
    return NextResponse.json({ error: 'Invalid collected_data' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('onboarding_state').upsert(
    {
      user_id: user.id,
      current_step: step,
      collected_data: collectedData,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    console.error('[onboarding/state]', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
