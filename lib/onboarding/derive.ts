import type {
  CollectedData,
  ConversionPriority,
  NextAction,
  UserType,
} from '@/types/onboarding';

interface DeriveInputs {
  stage: CollectedData['stage'];
  target_clarity: CollectedData['target_clarity'];
  confidence: CollectedData['confidence'];
  career_direction: CollectedData['career_direction'];
  commitment_signal: CollectedData['commitment_signal'];
  primary_blocker: CollectedData['primary_blocker'];
}

interface DeriveOutputs {
  user_type: UserType;
  next_action: NextAction;
  conversion_priority: ConversionPriority;
}

export function deriveOutputs(inputs: DeriveInputs): DeriveOutputs {
  const {
    stage,
    target_clarity,
    confidence,
    career_direction,
    commitment_signal,
  } = inputs;

  let user_type: UserType;
  if (
    (stage === 'applying_soon' || stage === 'urgent') &&
    commitment_signal === 'preparing'
  ) {
    user_type = 'executor';
  } else if (
    target_clarity === 'specific' &&
    career_direction === 'clear_goal'
  ) {
    user_type = 'planner';
  } else if (
    target_clarity === 'none' &&
    confidence === 'low' &&
    career_direction === 'no_idea'
  ) {
    user_type = 'lost';
  } else {
    user_type = 'explorer';
  }

  let next_action: NextAction;
  if (stage === 'urgent' || user_type === 'executor') {
    next_action = 'escalate';
  } else if (target_clarity === 'specific' && stage === 'applying_soon') {
    next_action = 'execute';
  } else if (user_type === 'planner' || target_clarity === 'field_only') {
    next_action = 'narrow';
  } else {
    next_action = 'educate';
  }

  let conversion_priority: ConversionPriority;
  if (
    stage === 'urgent' ||
    stage === 'applying_soon' ||
    commitment_signal === 'preparing'
  ) {
    conversion_priority = 'high';
  } else if (
    commitment_signal === 'researching' ||
    user_type === 'planner'
  ) {
    conversion_priority = 'medium';
  } else {
    conversion_priority = 'low';
  }

  return { user_type, next_action, conversion_priority };
}
