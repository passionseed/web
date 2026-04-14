"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  Target,
  Bot,
  Calendar,
  RefreshCw,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  NorthStarMetrics, 
  FunnelStage, 
  CohortData, 
  DashboardAlert, 
  AIAgentStatus,
  ContentSuggestion,
  WeeklyRetro
} from "./types";
import {
  getNorthStarMetrics,
  getFunnelMetrics,
  getCohortRetention,
  getActiveAlerts,
  getAIAgentStatuses,
  getContentSuggestions,
  getLatestRetro,
  generateRetro,
  resolveAlert,
  approveContent
} from "@/lib/supabase/ceo-dashboard";
import { cn } from "@/lib/utils";

interface CEODashboardProps {
  userId: string;
}

export function CEODashboard({ userId }: CEODashboardProps) {
  const [metrics, setMetrics] = useState<NorthStarMetrics | null>(null);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [agents, setAgents] = useState<AIAgentStatus[]>([]);
  const [content, setContent] = useState<ContentSuggestion[]>([]);
  const [retro, setRetro] = useState<WeeklyRetro | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingRetro, setGeneratingRetro] = useState(false);

  useEffect(() => {
    loadData();
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        });
      },
      { threshold: 0.3 }
    );

    const cards = document.querySelectorAll(".ei-card");
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [
        metricsData,
        funnelData,
        cohortsData,
        alertsData,
        agentsData,
        contentData,
        retroData
      ] = await Promise.all([
        getNorthStarMetrics(),
        getFunnelMetrics(),
        getCohortRetention(),
        getActiveAlerts(),
        getAIAgentStatuses(),
        getContentSuggestions(),
        getLatestRetro()
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
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateRetro() {
    setGeneratingRetro(true);
    try {
      const newRetro = await generateRetro();
      setRetro(newRetro);
    } catch (error) {
      console.error("Error generating retro:", error);
    } finally {
      setGeneratingRetro(false);
    }
  }

  async function handleResolveAlert(alertId: string) {
    await resolveAlert(alertId);
    setAlerts(alerts.filter((a) => a.id !== alertId));
  }

  async function handleApproveContent(suggestionId: string) {
    await approveContent(suggestionId);
    setContent(content.filter((c) => c.id !== suggestionId));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dusk-gradient">
        <div className="flex items-center gap-3 text-amber-100/70">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="font-bai-jamjuree text-sm tracking-wide">
            Loading CEO Dashboard...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden dusk-gradient">
      <div className="dusk-atmosphere" />
      
      <header className="relative z-10 border-b border-white/[0.05] bg-[#06000f]/80 backdrop-blur-xl sticky top-0">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Team
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white font-kodchasan tracking-tight">
                PassionSeed CEO Dashboard
              </h1>
              <p className="text-sm text-slate-400 font-bai-jamjuree mt-0.5">
                PMF Command Center • Live Data
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={loadData}
                className="ei-button-outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm" className="ei-button-dusk">
                <Target className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-6 py-8 space-y-8">
        {alerts.filter((a) => a.severity === "critical" || a.severity === "warning").length > 0 && (
          <div className="space-y-3">
            {alerts
              .filter((a) => a.severity === "critical" || a.severity === "warning")
              .slice(0, 3)
              .map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "relative overflow-hidden rounded-xl p-4 border backdrop-blur-sm",
                    alert.severity === "critical"
                      ? "bg-red-950/30 border-red-500/30"
                      : "bg-amber-950/30 border-amber-500/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className={cn(
                      "h-5 w-5 flex-shrink-0 mt-0.5",
                      alert.severity === "critical" ? "text-red-400" : "text-amber-400"
                    )} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-sm font-semibold",
                          alert.severity === "critical" ? "text-red-300" : "text-amber-300"
                        )}>
                          {alert.severity === "critical" ? "Critical Issue" : "Attention Needed"}
                        </span>
                        {alert.affected_users && (
                          <Badge variant="secondary" className="bg-white/5 text-slate-300 border-white/10">
                            {alert.affected_users} users
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-300">{alert.message}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResolveAlert(alert.id)}
                      className="text-slate-400 hover:text-white hover:bg-white/5"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white font-kodchasan tracking-tight">
            <Target className="h-5 w-5 text-amber-400" />
            North Star Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Monthly Revenue (MRR)"
              value={`฿${metrics?.mrr.toLocaleString() || "0"}`}
              change={metrics?.mrr_change || 0}
              icon={<DollarSign className="h-5 w-5" />}
              trend={metrics?.mrr_change && metrics.mrr_change > 0 ? "up" : "down"}
            />
            <MetricCard
              title="Paying Customers"
              value={metrics?.paying_customers.toString() || "0"}
              change={metrics?.customers_change || 0}
              icon={<Users className="h-5 w-5" />}
              trend={metrics?.customers_change && metrics.customers_change > 0 ? "up" : "down"}
            />
            <MetricCard
              title="Week-4 Retention"
              value={`${metrics?.week4_retention || 0}%`}
              change={metrics?.retention_change || 0}
              icon={<Activity className="h-5 w-5" />}
              trend={metrics?.retention_change && metrics.retention_change > 0 ? "up" : "down"}
            />
            <MetricCard
              title="Customer Acquisition Cost"
              value={`฿${metrics?.cac || 0}`}
              change={metrics?.cac_change || 0}
              icon={<TrendingUp className="h-5 w-5" />}
              trend={metrics?.cac_change && metrics.cac_change < 0 ? "up" : "down"}
              inverseTrend
            />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white font-kodchasan tracking-tight">
              <TrendingDown className="h-5 w-5 text-amber-400" />
              Hackathon → Paid Funnel
            </h2>
            <div className="ei-card p-6">
              <div className="space-y-4">
                {funnel.map((stage, index) => (
                  <div key={stage.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-200 font-bai-jamjuree">
                        {stage.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-mono text-xs">
                          {stage.count.toLocaleString()} users
                        </span>
                        {index > 0 && (
                          <Badge
                            variant={stage.is_target_met ? "default" : "destructive"}
                            className={cn(
                              "text-xs font-mono",
                              stage.is_target_met
                                ? "bg-green-500/10 text-green-400 border-green-500/30"
                                : "bg-red-500/10 text-red-400 border-red-500/30"
                            )}
                          >
                            {stage.conversion_rate}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <Progress
                        value={index === 0 ? 100 : stage.conversion_rate}
                        className={cn(
                          "h-2.5 bg-white/5",
                          !stage.is_target_met && index > 0 && "[&>div]:bg-red-500"
                        )}
                      />
                      {index > 0 && !stage.is_target_met && (
                        <div className="absolute -top-1 right-0">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                        </div>
                      )}
                    </div>
                    {index < funnel.length - 1 && (
                      <div className="flex justify-center py-1">
                        <ArrowRight className="h-4 w-4 text-slate-600 rotate-90" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white font-kodchasan tracking-tight">
              <Activity className="h-5 w-5 text-amber-400" />
              Cohort Retention
            </h2>
            <div className="ei-card p-6">
              <div className="space-y-5">
                {cohorts.slice(0, 3).map((cohort) => (
                  <div key={cohort.cohort_date} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-200">
                        {new Date(cohort.cohort_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })} Cohort
                      </span>
                      <span className="text-slate-400 text-xs font-mono">
                        {cohort.total_users} users
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {cohort.retention.map((week) => (
                        <div
                          key={week.week}
                          className="flex-1 space-y-1"
                          title={`Week ${week.week}: ${week.users} users (${week.rate}%)`}
                        >
                          <div
                            className={cn(
                              "h-8 rounded-sm transition-all duration-500",
                              week.rate >= 50
                                ? "bg-emerald-500/60"
                                : week.rate >= 30
                                ? "bg-amber-500/60"
                                : "bg-red-500/60"
                            )}
                            style={{ opacity: 0.3 + (week.rate / 100) * 0.7 }}
                          />
                          <div className="text-center text-[10px] text-slate-500 font-mono">
                            W{week.week}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white font-kodchasan tracking-tight">
            <Bot className="h-5 w-5 text-amber-400" />
            AI Agents Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {agents.map((agent) => (
              <motion.div
                key={agent.agent_name}
                whileHover={{ y: -3 }}
                className={cn(
                  "ei-card p-5 border-l-4",
                  agent.is_healthy
                    ? "border-l-emerald-500"
                    : "border-l-red-500"
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-amber-400" />
                    <span className="font-semibold text-white text-sm">
                      {agent.agent_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        agent.is_healthy ? "bg-emerald-500" : "bg-red-500"
                      )}
                    />
                    <span className="text-xs text-slate-400">
                      {agent.is_healthy ? "Healthy" : "Issue Detected"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    Last run: {new Date(agent.last_run).toLocaleDateString()}
                  </p>
                  {agent.alerts_generated > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs"
                    >
                      {agent.alerts_generated} alerts
                    </Badge>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-white font-kodchasan tracking-tight">
                <RefreshCw className="h-5 w-5 text-amber-400" />
                Weekly Retro
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateRetro}
                disabled={generatingRetro}
                className="ei-button-outline"
              >
                {generatingRetro ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Generate New
              </Button>
            </div>
            <div className="ei-card p-6">
              <div className="space-y-6">
                {retro ? (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Wins
                      </h3>
                      <ul className="space-y-2">
                        {retro.wins.map((win, i) => (
                          <li
                            key={i}
                            className="text-sm text-slate-300 flex items-start gap-2"
                          >
                            <span className="text-emerald-500 mt-1">•</span>
                            {win}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Separator className="bg-white/5" />
                    <div>
                      <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Blockers
                      </h3>
                      <ul className="space-y-2">
                        {retro.blockers.length > 0 ? (
                          retro.blockers.map((blocker, i) => (
                            <li
                              key={i}
                              className="text-sm text-slate-300 flex items-start gap-2"
                            >
                              <span className="text-red-500 mt-1">•</span>
                              {blocker}
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-slate-500">
                            No major blockers this week
                          </li>
                        )}
                      </ul>
                    </div>
                    <Separator className="bg-white/5" />
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-3">
                        Action Items
                      </h3>
                      <ul className="space-y-2">
                        {retro.action_items.map((item, i) => (
                          <li
                            key={i}
                            className="text-sm flex items-center justify-between text-slate-300"
                          >
                            <span>{item.task}</span>
                            <Badge
                              variant="outline"
                              size="sm"
                              className="border-white/10 text-slate-400"
                            >
                              {item.owner}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <p>No retro generated yet</p>
                    <Button
                      variant="outline"
                      className="mt-4 ei-button-outline"
                      onClick={handleGenerateRetro}
                      disabled={generatingRetro}
                    >
                      Generate First Retro
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white font-kodchasan tracking-tight">
              <Calendar className="h-5 w-5 text-amber-400" />
              AI Content Suggestions
            </h2>
            <div className="ei-card p-6">
              <div className="space-y-3">
                {content.length > 0 ? (
                  content.slice(0, 3).map((suggestion) => (
                    <motion.div
                      key={suggestion.id}
                      whileHover={{ x: 4 }}
                      className="p-4 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant="secondary"
                              className="text-xs capitalize bg-amber-500/10 text-amber-400 border-amber-500/20"
                            >
                              {suggestion.platform}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {new Date(suggestion.suggested_date).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </span>
                          </div>
                          <h4 className="text-sm font-medium text-slate-200 mb-1 group-hover:text-white transition-colors">
                            {suggestion.title}
                          </h4>
                          {suggestion.ai_reasoning && (
                            <p className="text-xs text-slate-500">
                              AI: {suggestion.ai_reasoning}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApproveContent(suggestion.id)}
                          className="text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <p>No content suggestions yet</p>
                    <p className="text-sm mt-1 text-slate-600">
                      AI agents will generate suggestions based on user signals
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  trend: "up" | "down";
  inverseTrend?: boolean;
}

function MetricCard({ title, value, change, icon, trend, inverseTrend }: MetricCardProps) {
  const isPositive = inverseTrend
    ? (trend === "down" && change > 0) || (trend === "up" && change < 0)
    : change > 0;

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="ei-card p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400 font-bai-jamjuree mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-white font-kodchasan tracking-tight">
            {value}
          </p>
          <div
            className={cn(
              "flex items-center gap-1 mt-2 text-xs font-medium",
              isPositive ? "text-emerald-400" : "text-red-400"
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {change > 0 ? "+" : ""}
            {change.toFixed(0)}%
            <span className="text-slate-500 font-normal ml-1">from last month</span>
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
