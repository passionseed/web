"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  Bot,
  Calendar,
  CheckCircle,
  DollarSign,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { AdminLoading } from "@/components/admin/shared/AdminStates";
import {
  approveContent,
  generateRetro,
  getActiveAlerts,
  getAIAgentStatuses,
  getCohortRetention,
  getContentSuggestions,
  getFunnelMetrics,
  getLatestRetro,
  getNorthStarMetrics,
  resolveAlert,
} from "@/lib/supabase/ceo-dashboard";
import { cn } from "@/lib/utils";
import type {
  AIAgentStatus,
  CohortData,
  ContentSuggestion,
  DashboardAlert,
  FunnelStage,
  NorthStarMetrics,
  WeeklyRetro,
} from "./types";

const PANEL = "rounded-lg border bg-card p-5 text-card-foreground";

function SectionTitle({ icon, children, action }: { icon: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <span className="text-muted-foreground" aria-hidden="true">
          {icon}
        </span>
        {children}
      </h2>
      {action}
    </div>
  );
}

function AlertBanner({ alert, onResolve }: { alert: DashboardAlert; onResolve: () => void }) {
  const critical = alert.severity === "critical";
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4",
        critical ? "border-destructive/50 bg-destructive/10" : "bg-muted/40",
      )}
    >
      <AlertCircle
        className={cn("mt-0.5 h-5 w-5 shrink-0", critical ? "text-destructive" : "text-muted-foreground")}
        aria-hidden="true"
      />
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-semibold">{critical ? "Critical issue" : "Needs attention"}</span>
          {alert.affected_users ? <Badge variant="secondary">{alert.affected_users} users</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">{alert.message}</p>
      </div>
      <Button variant="ghost" size="sm" className="min-h-11 active:bg-accent" onClick={onResolve}>
        <CheckCircle className="h-4 w-4" aria-hidden="true" />
        Resolve
      </Button>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: ReactNode;
  /** For costs, a fall is good news. */
  lowerIsBetter?: boolean;
  note?: string;
}

function MetricCard({ title, value, change, icon, lowerIsBetter, note }: MetricCardProps) {
  const good = lowerIsBetter ? change < 0 : change > 0;
  const TrendIcon = change >= 0 ? TrendingUp : TrendingDown;
  return (
    <div className={PANEL}>
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-1 text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          <p
            className={cn(
              "mt-2 flex items-center gap-1 text-xs",
              change === 0 ? "text-muted-foreground" : good ? "text-foreground" : "text-destructive",
            )}
          >
            <TrendIcon className="h-3 w-3" aria-hidden="true" />
            {change > 0 ? "+" : ""}
            {change.toFixed(0)}%<span className="ml-1 text-muted-foreground">{note ?? "vs previous 30 days"}</span>
          </p>
        </div>
        <span className="rounded-md bg-muted p-2 text-muted-foreground" aria-hidden="true">
          {icon}
        </span>
      </div>
    </div>
  );
}

function FunnelPanel({ funnel }: { funnel: FunnelStage[] }) {
  if (funnel.length === 0) {
    return <p className={cn(PANEL, "text-sm text-muted-foreground")}>No funnel events recorded yet.</p>;
  }
  return (
    <div className={cn(PANEL, "space-y-4")}>
      {funnel.map((stage, index) => {
        const missed = index > 0 && !stage.is_target_met;
        return (
          <div key={stage.name} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{stage.name}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">{stage.count.toLocaleString()} users</span>
                {index > 0 && (
                  <Badge variant={missed ? "destructive" : "secondary"} className="font-mono text-xs">
                    {stage.conversion_rate}%
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress
                value={index === 0 ? 100 : stage.conversion_rate}
                className={cn("h-2.5 flex-1", missed && "[&>div]:bg-destructive")}
                aria-label={`${stage.name} conversion`}
              />
              {missed && <AlertTriangle className="h-4 w-4 text-destructive" aria-label="Below target" />}
            </div>
            {index < funnel.length - 1 && (
              <div className="flex justify-center">
                <ArrowDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CohortPanel({ cohorts }: { cohorts: CohortData[] }) {
  if (cohorts.length === 0) {
    return <p className={cn(PANEL, "text-sm text-muted-foreground")}>No cohorts assigned yet.</p>;
  }
  return (
    <div className={cn(PANEL, "space-y-5")}>
      {cohorts.slice(0, 3).map((cohort) => (
        <div key={cohort.cohort_date} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {new Date(cohort.cohort_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} cohort
            </span>
            <span className="font-mono text-xs text-muted-foreground">{cohort.total_users} users</span>
          </div>
          <div className="flex gap-1">
            {cohort.retention.map((week) => (
              <div key={week.week} className="flex-1 space-y-1">
                <div
                  className="flex h-8 items-center justify-center rounded-sm bg-primary/15 font-mono text-[11px]"
                  style={{ opacity: 0.4 + (week.rate / 100) * 0.6 }}
                  title={`Week ${week.week}: ${week.users} users (${week.rate}%)`}
                >
                  {week.rate}%
                </div>
                <div className="text-center font-mono text-[11px] text-muted-foreground">W{week.week}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AgentCard({ agent }: { agent: AIAgentStatus }) {
  return (
    <div className={cn(PANEL, "space-y-2")}>
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-semibold">{agent.agent_name}</span>
      </div>
      <p className={cn("text-xs", agent.is_healthy ? "text-muted-foreground" : "text-destructive")}>
        {agent.is_healthy ? "Healthy" : "Issue detected"}
      </p>
      <p className="font-mono text-xs text-muted-foreground">
        Last run {new Date(agent.last_run).toLocaleDateString("en-GB")}
      </p>
      {agent.alerts_generated > 0 && <Badge variant="secondary">{agent.alerts_generated} alerts</Badge>}
    </div>
  );
}

function RetroList({ title, items, empty }: { title: string; items: string[]; empty?: string }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {items.length > 0 ? items.map((item, i) => <li key={i}>{item}</li>) : <li>{empty ?? "None"}</li>}
      </ul>
    </div>
  );
}

function RetroPanel({
  retro,
  generating,
  onGenerate,
}: {
  retro: WeeklyRetro | null;
  generating: boolean;
  onGenerate: () => void;
}) {
  if (!retro) {
    return (
      <div className={cn(PANEL, "py-8 text-center text-sm text-muted-foreground")}>
        <p>No retro generated yet.</p>
        <Button variant="outline" className="mt-4 min-h-11 active:bg-accent" onClick={onGenerate} disabled={generating}>
          Generate the first retro
        </Button>
      </div>
    );
  }
  return (
    <div className={cn(PANEL, "space-y-4")}>
      <RetroList title="Wins" items={retro.wins} />
      <Separator />
      <RetroList title="Blockers" items={retro.blockers} empty="No major blockers this week" />
      <Separator />
      <div>
        <h3 className="mb-2 text-sm font-semibold">Action items</h3>
        <ul className="space-y-2">
          {retro.action_items.map((item, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>{item.task}</span>
              {item.owner && <Badge variant="outline">{item.owner}</Badge>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ContentPanel({ content, onApprove }: { content: ContentSuggestion[]; onApprove: (id: string) => void }) {
  if (content.length === 0) {
    return (
      <div className={cn(PANEL, "py-8 text-center text-sm text-muted-foreground")}>
        <p>No content suggestions yet.</p>
        <p className="mt-1">The AI agents add them from user signals.</p>
      </div>
    );
  }
  return (
    <div className={cn(PANEL, "space-y-3")}>
      {content.slice(0, 3).map((suggestion) => (
        <div key={suggestion.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {suggestion.platform}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(suggestion.suggested_date).toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
            <h4 className="text-sm font-medium">{suggestion.title}</h4>
            {suggestion.ai_reasoning && <p className="text-xs text-muted-foreground">AI: {suggestion.ai_reasoning}</p>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 active:bg-accent"
            onClick={() => onApprove(suggestion.id)}
            aria-label={`Approve ${suggestion.title}`}
          >
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ))}
    </div>
  );
}

export function CEODashboard() {
  const [metrics, setMetrics] = useState<NorthStarMetrics | null>(null);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [agents, setAgents] = useState<AIAgentStatus[]>([]);
  const [content, setContent] = useState<ContentSuggestion[]>([]);
  const [retro, setRetro] = useState<WeeklyRetro | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingRetro, setGeneratingRetro] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsData, funnelData, cohortsData, alertsData, agentsData, contentData, retroData] = await Promise.all([
        getNorthStarMetrics(),
        getFunnelMetrics(),
        getCohortRetention(),
        getActiveAlerts(),
        getAIAgentStatuses(),
        getContentSuggestions(),
        getLatestRetro(),
      ]);
      setMetrics(metricsData);
      setFunnel(funnelData);
      setCohorts(cohortsData);
      setAlerts(alertsData);
      setAgents(agentsData);
      setContent(contentData);
      setRetro(retroData);
    } catch (error) {
      console.error("Error loading CEO dashboard data:", error);
      toast.error("Could not load the dashboard", { description: "Try Refresh in a moment." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleGenerateRetro() {
    setGeneratingRetro(true);
    try {
      setRetro(await generateRetro());
      toast.success("Retro generated");
    } catch (error) {
      console.error("Error generating retro:", error);
      toast.error("Could not generate the retro");
    } finally {
      setGeneratingRetro(false);
    }
  }

  async function handleResolveAlert(alertId: string) {
    try {
      await resolveAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      toast.success("Alert resolved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resolve the alert");
    }
  }

  async function handleApproveContent(suggestionId: string) {
    try {
      await approveContent(suggestionId);
      setContent((prev) => prev.filter((c) => c.id !== suggestionId));
      toast.success("Suggestion approved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not approve the suggestion");
    }
  }

  if (loading && !metrics) {
    return <AdminLoading rows={6} rowClassName="h-24" label="Loading the CEO dashboard" />;
  }

  const urgentAlerts = alerts.filter((a) => a.severity === "critical" || a.severity === "warning").slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="min-h-11 active:bg-accent" onClick={loadData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {urgentAlerts.length > 0 && (
        <div className="space-y-3">
          {urgentAlerts.map((alert) => (
            <AlertBanner key={alert.id} alert={alert} onResolve={() => handleResolveAlert(alert.id)} />
          ))}
        </div>
      )}

      <section>
        <SectionTitle icon={<Target className="h-4 w-4" />}>North star metrics</SectionTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Recorded revenue, 30 days"
            value={`฿${(metrics?.mrr ?? 0).toLocaleString()}`}
            change={metrics?.mrr_change ?? 0}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <MetricCard
            title="Paying customers"
            value={(metrics?.paying_customers ?? 0).toLocaleString()}
            change={metrics?.customers_change ?? 0}
            icon={<Users className="h-5 w-5" />}
            note="all time"
          />
          <MetricCard
            title="Week 4 retention"
            value={`${metrics?.week4_retention ?? 0}%`}
            change={metrics?.retention_change ?? 0}
            icon={<Activity className="h-5 w-5" />}
          />
          <MetricCard
            title="Customer acquisition cost"
            value={`฿${metrics?.cac ?? 0}`}
            change={metrics?.cac_change ?? 0}
            icon={<TrendingUp className="h-5 w-5" />}
            lowerIsBetter
            note="not tracked yet"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle icon={<TrendingDown className="h-4 w-4" />}>Hackathon to paid funnel</SectionTitle>
          <FunnelPanel funnel={funnel} />
        </section>
        <section>
          <SectionTitle icon={<Activity className="h-4 w-4" />}>Cohort retention</SectionTitle>
          <CohortPanel cohorts={cohorts} />
        </section>
      </div>

      <section>
        <SectionTitle icon={<Bot className="h-4 w-4" />}>AI agents</SectionTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {agents.map((agent) => (
            <AgentCard key={agent.agent_name} agent={agent} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle
            icon={<RefreshCw className="h-4 w-4" />}
            action={
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 active:bg-accent"
                onClick={handleGenerateRetro}
                disabled={generatingRetro}
              >
                <RefreshCw className={cn("h-4 w-4", generatingRetro && "animate-spin")} aria-hidden="true" />
                Generate new
              </Button>
            }
          >
            Weekly retro
          </SectionTitle>
          <RetroPanel retro={retro} generating={generatingRetro} onGenerate={handleGenerateRetro} />
        </section>
        <section>
          <SectionTitle icon={<Calendar className="h-4 w-4" />}>AI content suggestions</SectionTitle>
          <ContentPanel content={content} onApprove={handleApproveContent} />
        </section>
      </div>
    </div>
  );
}
