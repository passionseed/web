import type { CcInterview, CcDashboardPayload } from "@/lib/cc-research/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface InsightCardsProps {
  payload: CcDashboardPayload;
  interviews: CcInterview[];
}

export function InsightCards({ payload, interviews }: InsightCardsProps) {
  const painTags = payload.topPainThemes || [];
  const objectionReasons = interviews
    .map((interview) => interview.painThemeTags || [])
    .flat()
    .reduce<Record<string, number>>((acc, value) => {
      const key = value.trim().toLowerCase();
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

  const topObjections = Object.entries(objectionReasons)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <div className="space-y-4">
      <Card className="border-white/15 bg-black/20">
        <CardHeader>
          <CardTitle className="text-sm">Pipeline Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <p>
            Discovered: <span className="font-semibold">{payload.pipelineStats.discovered}</span>
          </p>
          <p>
            Scored: <span className="font-semibold">{payload.pipelineStats.scored}</span>
          </p>
          <p>
            Outreach Sent: <span className="font-semibold">{payload.pipelineStats.outreachSent}</span>
          </p>
          <p>
            Replies: <span className="font-semibold">{payload.pipelineStats.replies}</span>
          </p>
          <p>
            Interviews: <span className="font-semibold">{payload.pipelineStats.interviews}</span>
          </p>
          <p>
            Completed: <span className="font-semibold">{payload.pipelineStats.completed}</span>
          </p>
        </CardContent>
      </Card>

      <Card className="border-white/15 bg-black/20">
        <CardHeader>
          <CardTitle className="text-sm">Pain Theme Signals</CardTitle>
          <CardDescription>Observed interview-level pain themes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {painTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No themes captured yet.</p>
          ) : (
            painTags.map((item) => (
              <div key={item.name} className="flex justify-between text-sm">
                <span>{item.name}</span>
                <span>{item.count}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-white/15 bg-black/20">
        <CardHeader>
          <CardTitle className="text-sm">Top objections</CardTitle>
          <CardDescription>From notes and interview tags</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {topObjections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No objections captured yet.</p>
          ) : (
            topObjections.map((entry) => (
              <Badge key={entry.name} variant="outline">
                {entry.name} ({entry.count})
              </Badge>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
