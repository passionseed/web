"use client";

import { useEffect, useState } from "react";
import {
  DirectionFinderResult,
  AssessmentAnswers,
  Message,
} from "@/types/direction-finder";
import { getAllUserDirectionFinderResults } from "@/app/actions/save-direction";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, ArrowRight, Sparkles, Map } from "lucide-react";
import { format } from "date-fns";
import { DirectionResults } from "./DirectionResults";
import { useLanguage } from "@/lib/i18n/language-context";

interface SavedResult {
  id: string;
  user_id: string;
  answers: AssessmentAnswers;
  result: DirectionFinderResult;
  chat_history: Message[];
  created_at: string;
}

export function SavedResultsList() {
  const [results, setResults] = useState<SavedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<SavedResult | null>(
    null
  );
  const { language: lang } = useLanguage();

  useEffect(() => {
    async function loadResults() {
      try {
        const data = await getAllUserDirectionFinderResults();
        setResults(data);
      } catch (error) {
        console.error("Failed to load results", error);
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, []);

  if (selectedResult) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setSelectedResult(null)}
            className="gap-2"
          >
            ← Back to History
          </Button>
          <div className="text-sm text-slate-400">
            Viewing result from{" "}
            {format(new Date(selectedResult.created_at), "PPP p")}
          </div>
        </div>
        <DirectionResults
          result={selectedResult.result}
          answers={selectedResult.answers}
          onComplete={() => setSelectedResult(null)}
          onBack={() => setSelectedResult(null)}
          chatHistory={selectedResult.chat_history}
          lang={lang}
          resultId={selectedResult.id}
          // Review mode: disable editing/refining
          onRefine={undefined}
          onStartNew={undefined}
          onSelect={undefined} // Or maybe allow re-selecting?
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-slate-400">Loading history...</div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-900/50">
        <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">
          No Direction Profiles Yet
        </h3>
        <p className="text-slate-400 mb-6">
          Start your journey to discover your ideal path.
        </p>
        <Button onClick={() => (window.location.href = "/me/journey")}>
          Go to Journey Map
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {results.map((item) => (
        <Card
          key={item.id}
          className="bg-slate-900/50 border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer group"
          onClick={() => setSelectedResult(item)}
        >
          <CardHeader>
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 group-hover:text-purple-300 group-hover:bg-purple-500/20 transition-colors">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {format(new Date(item.created_at), "MMM d, yyyy")}
              </span>
            </div>
            <CardTitle className="text-white text-lg line-clamp-1">
              {item.result.vectors[0]?.name || "Unknown Direction"}
            </CardTitle>
            <CardDescription className="line-clamp-2 min-h-[2.5rem]">
              {item.result.vectors[0]?.differentiators?.main_focus ||
                "Explore this path to see where it leads."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {item.result.vectors.slice(0, 2).map((v, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-slate-300 bg-slate-950/50 p-2 rounded border border-slate-800/50"
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-purple-500" : "bg-slate-600"}`}
                  />
                  <span className="truncate">{v.name}</span>
                </div>
              ))}
              {item.result.vectors.length > 2 && (
                <div className="text-xs text-slate-500 pl-2">
                  +{item.result.vectors.length - 2} more paths
                </div>
              )}
            </div>

            <Button className="w-full gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 group-hover:border-purple-500/30">
              View Profile <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
