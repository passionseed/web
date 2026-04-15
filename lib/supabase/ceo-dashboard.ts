import { createClient } from "@/utils/supabase/client";
import { 
  FunnelMetrics, 
  DashboardAlert, 
  AIAgentStatus, 
  ContentSuggestion,
  WeeklyRetro,
  NorthStarMetrics,
  FunnelStage,
  CohortData
} from "@/components/admin/ceo/types";

const supabase = createClient();

export async function getNorthStarMetrics(): Promise<NorthStarMetrics> {
  const { data: allEvents } = await supabase
    .from('funnel_events')
    .select('event_name, user_id, event_timestamp');

  const events = allEvents || [];
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  
  const currentEvents = events.filter(e => new Date(e.event_timestamp) >= thirtyDaysAgo);
  const previousEvents = events.filter(e => {
    const date = new Date(e.event_timestamp);
    return date >= sixtyDaysAgo && date < thirtyDaysAgo;
  });
  
  const allTimeHackathon = new Set(events.filter(e => e.event_name === 'hackathon_signup').map(e => e.user_id));
  const allTimeApp = new Set(events.filter(e => e.event_name === 'app_register').map(e => e.user_id));
  const allTimePortfolio = new Set(events.filter(e => e.event_name === 'portfolio_complete').map(e => e.user_id));
  const allTimePaid = new Set(events.filter(e => e.event_name === 'payment_convert').map(e => e.user_id));
  
  return {
    mrr: 0,
    mrr_change: 0,
    paying_customers: allTimePaid.size,
    customers_change: 0,
    week4_retention: calculateRetention(currentEvents, previousEvents),
    retention_change: 0,
    cac: 0,
    cac_change: 0,
    hackathon_signups: allTimeHackathon.size,
    app_adoption: allTimeApp.size,
    portfolio_completions: allTimePortfolio.size,
  };
}

function calculateRetention(currentEvents: any[], previousEvents: any[]): number {
  // Simplified retention calculation
  const currentActive = new Set(currentEvents.filter(e => e.event_name === 'weekly_active').map(e => e.user_id));
  const totalUsers = new Set(currentEvents.map(e => e.user_id));
  
  if (totalUsers.size === 0) return 0;
  return Math.round((currentActive.size / totalUsers.size) * 100);
}

export async function getFunnelMetrics(): Promise<FunnelStage[]> {
  const { data: events } = await supabase
    .from('funnel_events')
    .select('event_name, user_id')
    .order('event_timestamp', { ascending: true });

  if (!events) return [];

  const funnelOrder = [
    'hackathon_signup',
    'app_register',
    'portfolio_complete',
    'grading_request',
    'payment_convert'
  ];

  const stages: FunnelStage[] = [];
  let previousCount = 0;

  for (let i = 0; i < funnelOrder.length; i++) {
    const eventName = funnelOrder[i];
    const users = new Set(events.filter(e => e.event_name === eventName).map(e => e.user_id));
    const count = users.size;
    
    let conversionRate = 100;
    if (i > 0 && previousCount > 0) {
      conversionRate = Math.round((count / previousCount) * 100);
    }

    const targets = [100, 50, 51, 44, 65];
    
    stages.push({
      name: eventName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count,
      previous_count: previousCount,
      conversion_rate: conversionRate,
      is_target_met: conversionRate >= targets[i]
    });
    
    previousCount = count;
  }

  return stages;
}

export async function getCohortRetention(): Promise<CohortData[]> {
  const { data: cohorts } = await supabase
    .from('cohort_assignments')
    .select('*')
    .order('cohort_date', { ascending: false })
    .limit(8);

  if (!cohorts) return [];

  const cohortData: CohortData[] = [];

  for (const cohort of cohorts) {
    const { data: users } = await supabase
      .from('cohort_assignments')
      .select('user_id')
      .eq('cohort_date', cohort.cohort_date);

    if (!users) continue;

    const userIds = users.map(u => u.user_id);
    const totalUsers = userIds.length;

    const { data: activity } = await supabase
      .from('funnel_events')
      .select('user_id, event_timestamp')
      .in('user_id', userIds)
      .eq('event_name', 'weekly_active')
      .gte('event_timestamp', cohort.cohort_date);

    const retention: { week: number; users: number; rate: number }[] = [];
    
    for (let week = 1; week <= 4; week++) {
      const weekStart = new Date(cohort.cohort_date);
      weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const activeUsers = new Set(
        activity?.filter(a => {
          const date = new Date(a.event_timestamp);
          return date >= weekStart && date < weekEnd;
        }).map(a => a.user_id) || []
      );

      retention.push({
        week,
        users: activeUsers.size,
        rate: Math.round((activeUsers.size / totalUsers) * 100)
      });
    }

    cohortData.push({
      cohort_date: cohort.cohort_date,
      total_users: totalUsers,
      retention
    });
  }

  return cohortData;
}

export async function getActiveAlerts(): Promise<DashboardAlert[]> {
  const { data: alerts } = await supabase
    .from('dashboard_alerts')
    .select('*')
    .eq('is_resolved', false)
    .order('created_at', { ascending: false })
    .limit(10);

  return alerts || [];
}

export async function resolveAlert(alertId: string): Promise<void> {
  await supabase
    .from('dashboard_alerts')
    .update({ 
      is_resolved: true, 
      resolved_at: new Date().toISOString() 
    })
    .eq('id', alertId);
}

export async function getAIAgentStatuses(): Promise<AIAgentStatus[]> {
  const agents = ['funnel_guardian', 'content_strategist', 'churn_predictor', 'retro_bot'];
  
  const statuses: AIAgentStatus[] = [];
  
  for (const agent of agents) {
    const { data: runs } = await supabase
      .from('ai_agent_runs')
      .select('*')
      .eq('agent_name', agent)
      .order('run_timestamp', { ascending: false })
      .limit(1);
    
    const lastRun = runs?.[0];
    
    statuses.push({
      agent_name: agent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      status: lastRun?.status || 'completed',
      last_run: lastRun?.run_timestamp || new Date().toISOString(),
      alerts_generated: lastRun?.alerts_generated || 0,
      is_healthy: !lastRun?.error_message && (lastRun?.status === 'completed' || lastRun?.status === 'alert_triggered')
    });
  }
  
  return statuses;
}

export async function getContentSuggestions(): Promise<ContentSuggestion[]> {
  const { data: suggestions } = await supabase
    .from('content_suggestions')
    .select('*')
    .eq('is_approved', false)
    .eq('is_posted', false)
    .gte('suggested_date', new Date().toISOString().split('T')[0])
    .order('suggested_date', { ascending: true })
    .limit(7);

  return suggestions || [];
}

export async function approveContent(suggestionId: string): Promise<void> {
  await supabase
    .from('content_suggestions')
    .update({ is_approved: true })
    .eq('id', suggestionId);
}

export async function getLatestRetro(): Promise<WeeklyRetro | null> {
  const { data: retros } = await supabase
    .from('weekly_retro')
    .select('*')
    .order('week_ending', { ascending: false })
    .limit(1);

  return retros?.[0] || null;
}

export async function generateRetro(): Promise<WeeklyRetro> {
  const endOfWeek = new Date();
  endOfWeek.setDate(endOfWeek.getDate() - endOfWeek.getDay());
  
  const metrics = await getNorthStarMetrics();
  
  const funnel = await getFunnelMetrics();
  
  const wins = [
    `${metrics.paying_customers} paying customers`,
    `MRR up ${metrics.mrr_change.toFixed(0)}%`,
    funnel[0]?.count ? `${funnel[0].count} new signups` : 'Strong top-of-funnel'
  ];
  
  const blockers = [];
  if (funnel[1]?.conversion_rate < 50) {
    blockers.push(`App conversion at ${funnel[1].conversion_rate}% (target: 50%)`);
  }
  if (metrics.week4_retention < 40) {
    blockers.push(`Week-4 retention at ${metrics.week4_retention}% (target: 40%)`);
  }
  
  const actionItems = [
    { task: 'Review stuck users and fix UX blockers', owner: 'Bunyasit', due_date: '' },
    { task: 'Follow up with at-risk customers', owner: 'Sattakun', due_date: '' }
  ];

  const retro: WeeklyRetro = {
    id: '',
    week_ending: endOfWeek.toISOString().split('T')[0],
    wins,
    blockers,
    action_items: actionItems,
    metrics_snapshot: {
      mrr: metrics.mrr,
      paying_customers: metrics.paying_customers,
      retention: metrics.week4_retention,
      cac: metrics.cac
    }
  };

  const { data } = await supabase
    .from('weekly_retro')
    .insert(retro)
    .select()
    .single();

  return data || retro;
}
