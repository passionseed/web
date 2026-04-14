"use client";

import { useEffect, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
    setAlerts(alerts.filter(a => a.id !== alertId));
  }

  async function handleApproveContent(suggestionId: string) {
    await approveContent(suggestionId);
    setContent(content.filter(c => c.id !== suggestionId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading CEO Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">PassionSeed CEO Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                PMF Command Center • Live Data
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm">
                <Target className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {alerts.length > 0 && (
          <div className="space-y-3">
            {alerts
              .filter(a => a.severity === 'critical' || a.severity === 'warning')
              .slice(0, 3)
              .map(alert => (
                <Alert 
                  key={alert.id} 
                  variant={alert.severity === 'critical' ? 'destructive' : 'default'}
                  className={cn(
                    "border-l-4",
                    alert.severity === 'critical' && "border-l-red-500",
                    alert.severity === 'warning' && "border-l-yellow-500"
                  )}
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="flex items-center gap-2">
                    {alert.severity === 'critical' ? 'Critical Issue' : 'Attention Needed'}
                    {alert.affected_users && (
                      <Badge variant="secondary">
                        {alert.affected_users} users
                      </Badge>
                    )}
                  </AlertTitle>
                  <AlertDescription className="flex items-center justify-between">
                    <span>{alert.message}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleResolveAlert(alert.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Resolve
                    </Button>
                  </AlertDescription>
                </Alert>
              ))}
          </div>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            North Star Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Monthly Revenue (MRR)"
              value={`฿${metrics?.mrr.toLocaleString() || '0'}`}
              change={metrics?.mrr_change || 0}
              icon={<DollarSign className="h-5 w-5" />}
              trend={metrics?.mrr_change && metrics.mrr_change > 0 ? 'up' : 'down'}
            />
            <MetricCard
              title="Paying Customers"
              value={metrics?.paying_customers.toString() || '0'}
              change={metrics?.customers_change || 0}
              icon={<Users className="h-5 w-5" />}
              trend={metrics?.customers_change && metrics.customers_change > 0 ? 'up' : 'down'}
            />
            <MetricCard
              title="Week-4 Retention"
              value={`${metrics?.week4_retention || 0}%`}
              change={metrics?.retention_change || 0}
              icon={<Activity className="h-5 w-5" />}
              trend={metrics?.retention_change && metrics.retention_change > 0 ? 'up' : 'down'}
            />
            <MetricCard
              title="Customer Acquisition Cost"
              value={`฿${metrics?.cac || 0}`}
              change={metrics?.cac_change || 0}
              icon={<TrendingUp className="h-5 w-5" />}
              trend={metrics?.cac_change && metrics.cac_change < 0 ? 'up' : 'down'}
              inverseTrend
            />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" />
              Hackathon → Paid Funnel
            </h2>
            <Card>
              <CardContent className="pt-6 space-y-4">
                {funnel.map((stage, index) => (
                  <div key={stage.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{stage.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          {stage.count.toLocaleString()} users
                        </span>
                        {index > 0 && (
                          <Badge 
                            variant={stage.is_target_met ? "default" : "destructive"}
                            className="text-xs"
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
                          "h-3",
                          !stage.is_target_met && index > 0 && "bg-red-100"
                        )}
                      />
                      {index > 0 && !stage.is_target_met && (
                        <div className="absolute -top-1 right-0">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        </div>
                      )}
                    </div>
                    {index < funnel.length - 1 && (
                      <div className="flex justify-center py-1">
                        <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Cohort Retention
            </h2>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {cohorts.slice(0, 3).map((cohort) => (
                    <div key={cohort.cohort_date} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {new Date(cohort.cohort_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })} Cohort
                        </span>
                        <span className="text-muted-foreground">
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
                                "h-8 rounded-sm transition-all",
                                week.rate >= 50 ? "bg-green-500" :
                                week.rate >= 30 ? "bg-yellow-500" : "bg-red-500"
                              )}
                              style={{ opacity: 0.3 + (week.rate / 100) * 0.7 }}
                            />
                            <div className="text-center text-xs text-muted-foreground">
                              W{week.week}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Agents Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {agents.map((agent) => (
              <Card key={agent.agent_name} className={cn(
                "border-l-4",
                agent.is_healthy ? "border-l-green-500" : "border-l-red-500"
              )}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    {agent.agent_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        agent.is_healthy ? "bg-green-500" : "bg-red-500"
                      )} />
                      <span className="text-sm text-muted-foreground">
                        {agent.is_healthy ? 'Healthy' : 'Issue Detected'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last run: {new Date(agent.last_run).toLocaleDateString()}
                    </p>
                    {agent.alerts_generated > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {agent.alerts_generated} alerts
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                Weekly Retro
              </h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleGenerateRetro}
                disabled={generatingRetro}
              >
                {generatingRetro ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Generate New
              </Button>
            </div>
            <Card>
              <CardContent className="pt-6 space-y-6">
                {retro ? (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Wins
                      </h3>
                      <ul className="space-y-1">
                        {retro.wins.map((win, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">•</span>
                            {win}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Blockers
                      </h3>
                      <ul className="space-y-1">
                        {retro.blockers.length > 0 ? retro.blockers.map((blocker, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">•</span>
                            {blocker}
                          </li>
                        )) : (
                          <li className="text-sm text-muted-foreground">No major blockers this week</li>
                        )}
                      </ul>
                    </div>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Action Items</h3>
                      <ul className="space-y-2">
                        {retro.action_items.map((item, i) => (
                          <li key={i} className="text-sm flex items-center justify-between">
                            <span>{item.task}</span>
                            <Badge variant="outline" size="sm">
                              {item.owner}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No retro generated yet</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={handleGenerateRetro}
                      disabled={generatingRetro}
                    >
                      Generate First Retro
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              AI Content Suggestions
            </h2>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {content.length > 0 ? content.slice(0, 3).map((suggestion) => (
                    <div 
                      key={suggestion.id} 
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs capitalize">
                              {suggestion.platform}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(suggestion.suggested_date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                          <h4 className="text-sm font-medium">{suggestion.title}</h4>
                          {suggestion.ai_reasoning && (
                            <p className="text-xs text-muted-foreground mt-1">
                              AI: {suggestion.ai_reasoning}
                            </p>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleApproveContent(suggestion.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No content suggestions yet</p>
                      <p className="text-sm mt-1">
                        AI agents will generate suggestions based on user signals
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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
  trend: 'up' | 'down';
  inverseTrend?: boolean;
}

function MetricCard({ title, value, change, icon, trend, inverseTrend }: MetricCardProps) {
  const isPositive = inverseTrend 
    ? (trend === 'down' && change > 0) || (trend === 'up' && change < 0)
    : change > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={cn(
          "text-xs flex items-center gap-1 mt-1",
          isPositive ? "text-green-600" : "text-red-600"
        )}>
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {change > 0 ? '+' : ''}{change.toFixed(0)}%
          <span className="text-muted-foreground ml-1">from last month</span>
        </p>
      </CardContent>
    </Card>
  );
}
