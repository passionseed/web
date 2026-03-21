import { deriveOutputs } from './derive';

describe('deriveOutputs', () => {
  it('classifies lost user', () => {
    const result = deriveOutputs({
      stage: 'exploring',
      target_clarity: 'none',
      confidence: 'low',
      career_direction: 'no_idea',
      commitment_signal: 'browsing',
      primary_blocker: 'dont_know',
    });

    expect(result.user_type).toBe('lost');
    expect(result.next_action).toBe('educate');
    expect(result.conversion_priority).toBe('low');
  });

  it('classifies executor', () => {
    const result = deriveOutputs({
      stage: 'urgent',
      target_clarity: 'specific',
      confidence: 'high',
      career_direction: 'clear_goal',
      commitment_signal: 'preparing',
      primary_blocker: 'application_process',
    });

    expect(result.user_type).toBe('executor');
    expect(result.next_action).toBe('escalate');
    expect(result.conversion_priority).toBe('high');
  });

  it('classifies planner (choosing stage -> narrow, not execute)', () => {
    const result = deriveOutputs({
      stage: 'choosing',
      target_clarity: 'specific',
      confidence: 'medium',
      career_direction: 'clear_goal',
      commitment_signal: 'researching',
      primary_blocker: 'low_profile',
    });

    expect(result.user_type).toBe('planner');
    expect(result.next_action).toBe('narrow');
    expect(result.conversion_priority).toBe('medium');
  });

  it('routes planner with applying_soon+specific to execute', () => {
    const result = deriveOutputs({
      stage: 'applying_soon',
      target_clarity: 'specific',
      confidence: 'high',
      career_direction: 'clear_goal',
      commitment_signal: 'researching',
      primary_blocker: 'application_process',
    });

    expect(result.next_action).toBe('execute');
    expect(result.conversion_priority).toBe('high');
  });

  it('classifies explorer', () => {
    const result = deriveOutputs({
      stage: 'exploring',
      target_clarity: 'field_only',
      confidence: 'low',
      career_direction: 'some_ideas',
      commitment_signal: 'researching',
      primary_blocker: 'dont_know',
    });

    expect(result.user_type).toBe('explorer');
    expect(result.next_action).toBe('narrow');
    expect(result.conversion_priority).toBe('medium');
  });
});
