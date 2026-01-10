"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, RefreshCw, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import {
  getClassroomDirectionFinderResults,
  DirectionFinderResultRow,
} from "@/app/actions/classroom/direction-finder";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ClassroomDirectionFinderProps {
  classroomId: string;
}

export function ClassroomDirectionFinder({
  classroomId,
}: ClassroomDirectionFinderProps) {
  const [results, setResults] = useState<DirectionFinderResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedResult, setSelectedResult] =
    useState<DirectionFinderResultRow | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getClassroomDirectionFinderResults(classroomId);
      setResults(data);
    } catch (error) {
      console.error("Error loading results:", error);
      toast.error("Failed to load direction finder results");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classroomId]);

  const filteredResults = results.filter((item) => {
    const searchLower = searchTerm.toLowerCase();

    // Search in user info
    if (
      item.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      item.profiles?.email?.toLowerCase().includes(searchLower) ||
      item.profiles?.username?.toLowerCase().includes(searchLower)
    ) {
      return true;
    }

    // Search in chat context
    if (item.chat_context?.toLowerCase().includes(searchLower)) {
      return true;
    }

    // Search in chat history
    if (
      item.chat_history?.some((msg) =>
        msg.content.toLowerCase().includes(searchLower)
      )
    ) {
      return true;
    }

    // Search in result vectors
    if (
      item.result?.vectors?.some((v) =>
        v.name.toLowerCase().includes(searchLower)
      )
    ) {
      return true;
    }

    return false;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Student Direction Results</CardTitle>
              <CardDescription>
                View AI assessment results and chat history for students in this
                classroom.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student, content, or results..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Top Vector</TableHead>
                  <TableHead>Top Program</TableHead>
                  <TableHead>Chat Length</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No results found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResults.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(item.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {item.profiles?.full_name || "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.profiles?.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.result?.vectors?.[0]?.name || (
                          <span className="text-muted-foreground italic">
                            No vectors
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.result?.programs?.[0]?.name || (
                          <span className="text-muted-foreground italic">
                            No programs
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.chat_history ? item.chat_history.length : 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedResult(item);
                            setIsSheetOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[800px] sm:max-w-[100vw] overflow-hidden flex flex-col p-0">
          <div className="p-6 border-b">
            <SheetHeader>
              <SheetTitle>Result Details</SheetTitle>
              <SheetDescription>
                Assessment for{" "}
                {selectedResult?.profiles?.full_name ||
                  selectedResult?.profiles?.email ||
                  "N/A"}
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-auto">
            {selectedResult && (
              <Tabs defaultValue="summary" className="h-full flex flex-col">
                <div className="px-6 pt-4">
                  <TabsList>
                    <TabsTrigger value="summary">Concise Summary</TabsTrigger>
                    <TabsTrigger value="chat">Chat History</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent
                  value="summary"
                  className="flex-1 px-6 pb-6 space-y-6 overflow-auto"
                >
                  <div className="mt-4 space-y-6">
                    {/* Results Overview */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Top Vectors (Directions)
                      </h3>
                      <div className="grid gap-4">
                        {selectedResult.result.vectors.map((vector, idx) => (
                          <Card key={idx}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">
                                {vector.name}
                              </CardTitle>
                              <div className="flex gap-2 text-sm text-muted-foreground">
                                <span>
                                  Match: {vector.match_scores?.overall ?? "N/A"}
                                  %
                                </span>
                                <span>•</span>
                                <span>
                                  Passion:{" "}
                                  {vector.match_scores?.passion ?? "N/A"}%
                                </span>
                                <span>•</span>
                                <span>
                                  Skill: {vector.match_scores?.skill ?? "N/A"}%
                                </span>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm mb-2 font-medium text-muted-foreground">
                                Why it fits:
                              </p>
                              <ul className="text-sm space-y-1 list-disc pl-4 mb-4">
                                <li>{vector.fit_reason.interest_alignment}</li>
                                <li>{vector.fit_reason.strength_alignment}</li>
                                <li>{vector.fit_reason.value_alignment}</li>
                              </ul>
                              <p className="text-sm font-medium text-primary">
                                First Step: {vector.first_step}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Recommended Programs
                      </h3>
                      <div className="space-y-3">
                        {selectedResult.result.programs.map((program, idx) => (
                          <div
                            key={idx}
                            className="p-3 border rounded-lg bg-muted/50"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium">
                                {program.name}
                              </span>
                              <Badge
                                variant={
                                  program.match_level === "High"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {program.match_level}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {program.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Profile Analysis
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 border rounded-lg">
                          <h4 className="font-medium mb-2">Energizers</h4>
                          <ul className="list-disc pl-4 text-sm text-muted-foreground">
                            {selectedResult.result.profile.energizers.map(
                              (e, i) => (
                                <li key={i}>{e}</li>
                              )
                            )}
                          </ul>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <h4 className="font-medium mb-2">Strengths</h4>
                          <ul className="list-disc pl-4 text-sm text-muted-foreground">
                            {selectedResult.result.profile.strengths.map(
                              (s, i) => (
                                <li key={i}>{s}</li>
                              )
                            )}
                          </ul>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <h4 className="font-medium mb-2">Values</h4>
                          <ul className="list-disc pl-4 text-sm text-muted-foreground">
                            {selectedResult.result.profile.values.map(
                              (v, i) => (
                                <li key={i}>{v}</li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent
                  value="chat"
                  className="flex-1 px-6 pb-6 overflow-hidden flex flex-col"
                >
                  <div className="mt-4 flex-1 border rounded-lg p-4 overflow-y-auto bg-slate-950/50">
                    <div className="space-y-4">
                      {selectedResult.chat_history?.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {(!selectedResult.chat_history ||
                        selectedResult.chat_history.length === 0) && (
                        <div className="text-center text-muted-foreground py-8">
                          No chat history available.
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
