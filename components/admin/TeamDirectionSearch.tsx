"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";

interface SearchResult {
  team_id: string;
  team_name: string;
  mission: string;
  similarity: number;
  cluster_label?: string;
  cluster_color?: string;
}

export function TeamDirectionSearch({ onSelectTeam }: { onSelectTeam: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [aspect, setAspect] = useState<"composite" | "mission" | "tech" | "market">("composite");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/hackathon/team-directions/search?q=${encodeURIComponent(query)}&aspect=${aspect}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search teams by mission, tech, market..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1"
        />
        <select
          value={aspect}
          onChange={(e) => setAspect(e.target.value as any)}
          className="border rounded px-2"
        >
          <option value="composite">All</option>
          <option value="mission">Mission</option>
          <option value="tech">Tech</option>
          <option value="market">Market</option>
        </select>
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      <div className="grid gap-2">
        {results.map((result) => (
          <Card
            key={result.team_id}
            className="p-4 cursor-pointer hover:bg-muted transition-colors"
            onClick={() => onSelectTeam(result.team_id)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{result.team_name}</h3>
                <p className="text-sm text-muted-foreground">{result.mission}</p>
              </div>
              <div className="flex items-center gap-2">
                {result.cluster_label && (
                  <Badge style={{ backgroundColor: result.cluster_color }}>
                    {result.cluster_label}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {(result.similarity * 100).toFixed(0)}% match
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
