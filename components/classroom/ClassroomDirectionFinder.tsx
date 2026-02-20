"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Eye,
  RefreshCw,
  BarChart3,
  Compass,
  Sparkles,
  CalendarCheck2,
  MessageSquare,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import {
  getClassroomDirectionFinderResults,
  DirectionFinderResultRow,
} from "@/app/actions/classroom/direction-finder";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DirectionVector } from "@/types/direction-finder";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
        `${v.name} ${v.industry} ${v.role}`.toLowerCase().includes(searchLower)
      )
    ) {
      return true;
    }

    return false;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStudentName = (item: DirectionFinderResultRow | null) => {
    if (!item) return "Student";
    return (
      item.profiles?.full_name ||
      item.profiles?.username ||
      item.profiles?.email?.split("@")[0] ||
      "Student"
    );
  };

  const getVectorLabel = (vector: DirectionVector) => {
    const fallback = [vector.industry, vector.role].filter(Boolean).join(" • ");
    return vector.name || fallback || "Untitled Direction";
  };

  const toPercent = (value?: number) => {
    if (typeof value !== "number" || Number.isNaN(value)) return 0;
    return Math.max(0, Math.min(100, value));
  };

  const selectedVectors = selectedResult?.result?.vectors?.slice(0, 3) || [];
  const topVector = selectedVectors[0];
  const selectedPrograms = selectedResult?.result?.programs || [];
  const selectedProfile = selectedResult?.result?.profile;
  const selectedCommitments = selectedResult?.result?.commitments;

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
                  <TableHead>Student</TableHead>
                  <TableHead>Top Directions</TableHead>
                  <TableHead>Fit Snapshot</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No results found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResults.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {getStudentName(item)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.profiles?.email || "Email not available"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {item.result?.vectors?.slice(0, 3).map((vector, idx) => (
                            <div key={`${item.id}-vector-${idx}`} className="flex items-center gap-2">
                              <Badge variant="outline" className="w-6 h-6 rounded-full p-0 justify-center">
                                {idx + 1}
                              </Badge>
                              <span className="text-sm truncate max-w-[220px]">
                                {getVectorLabel(vector)}
                              </span>
                            </div>
                          ))}
                          {!item.result?.vectors?.length && (
                            <span className="text-sm text-muted-foreground">No directions generated</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.result?.vectors?.[0]?.match_scores ? (
                          <div className="w-[180px] space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Overall</span>
                              <span>{toPercent(item.result.vectors[0].match_scores.overall)}%</span>
                            </div>
                            <Progress
                              value={toPercent(item.result.vectors[0].match_scores.overall)}
                              className="h-2"
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No score</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(item.updated_at || item.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedResult(item);
                            setIsDialogOpen(true);
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[1200px] w-[95vw] h-[90vh] p-0 overflow-hidden gap-0">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30">
            <DialogTitle className="text-xl">
              {getStudentName(selectedResult)} • Direction Result
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Latest update: {selectedResult ? formatDate(selectedResult.updated_at || selectedResult.created_at) : "-"}
            </p>
          </DialogHeader>

          <Tabs defaultValue="visual" className="flex-1 h-[calc(90vh-84px)] flex flex-col">
            <TabsList className="mx-6 mt-4 w-fit">
              <TabsTrigger value="visual" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Visual Summary
              </TabsTrigger>
              <TabsTrigger value="answers" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Answers & Chat
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat Only
              </TabsTrigger>
            </TabsList>

            <TabsContent value="visual" className="flex-1 mt-4 px-6 pb-6 overflow-hidden">
              <ScrollArea className="h-full pr-4">
                {selectedResult ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card className="md:col-span-2">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2">
                            <Compass className="h-5 w-5 text-blue-500" />
                            Top Direction Match
                          </CardTitle>
                          <CardDescription>
                            Ranked by overall fit score.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {selectedVectors.length > 0 ? (
                            selectedVectors.map((vector, idx) => (
                              <div key={`selected-vector-${idx}`} className="space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <Badge variant={idx === 0 ? "default" : "secondary"}>
                                        #{idx + 1}
                                      </Badge>
                                      <span className="font-medium truncate">
                                        {getVectorLabel(vector)}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 truncate">
                                      {[vector.industry, vector.role, vector.specialization]
                                        .filter(Boolean)
                                        .join(" • ")}
                                    </p>
                                  </div>
                                  <Badge variant="outline">
                                    {toPercent(vector.match_scores?.overall)}%
                                  </Badge>
                                </div>
                                <Progress
                                  value={toPercent(vector.match_scores?.overall)}
                                  className="h-2"
                                />
                                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                                  <span>Passion: {toPercent(vector.match_scores?.passion)}%</span>
                                  <span>Skill: {toPercent(vector.match_scores?.skill)}%</span>
                                  <span>Overall: {toPercent(vector.match_scores?.overall)}%</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No direction vectors available.
                            </p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-violet-500" />
                            Best Fit
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {topVector ? (
                            <>
                              <p className="font-medium leading-snug">
                                {getVectorLabel(topVector)}
                              </p>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {topVector.fit_reason?.interest_alignment}
                              </p>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {topVector.fit_reason?.strength_alignment}
                              </p>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {topVector.fit_reason?.value_alignment}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No top vector available.
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle>Recommended Programs</CardTitle>
                          <CardDescription>
                            Suggested pathways aligned to the student profile.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {selectedPrograms.length > 0 ? (
                            selectedPrograms.map((program, idx) => (
                              <div
                                key={`program-${idx}`}
                                className="rounded-lg border p-3 bg-muted/20"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-medium text-sm">{program.name}</p>
                                  <Badge variant="outline">
                                    {program.match_level} • {toPercent(program.match_percentage)}%
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                  {program.reason}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No program recommendations available.
                            </p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle>Action Commitments</CardTitle>
                          <CardDescription>
                            Weekly and monthly actions from the generated result.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <p className="text-sm font-medium flex items-center gap-2 mb-2">
                              <CalendarCheck2 className="h-4 w-4 text-emerald-500" />
                              This Week
                            </p>
                            <div className="space-y-2">
                              {(selectedCommitments?.this_week || []).map((item, idx) => (
                                <div
                                  key={`week-${idx}`}
                                  className="text-sm rounded-md border p-2 bg-background"
                                >
                                  {item}
                                </div>
                              ))}
                              {!selectedCommitments?.this_week?.length && (
                                <p className="text-sm text-muted-foreground">
                                  No weekly commitments.
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium flex items-center gap-2 mb-2">
                              <CalendarCheck2 className="h-4 w-4 text-blue-500" />
                              This Month
                            </p>
                            <div className="space-y-2">
                              {(selectedCommitments?.this_month || []).map((item, idx) => (
                                <div
                                  key={`month-${idx}`}
                                  className="text-sm rounded-md border p-2 bg-background"
                                >
                                  {item}
                                </div>
                              ))}
                              {!selectedCommitments?.this_month?.length && (
                                <p className="text-sm text-muted-foreground">
                                  No monthly commitments.
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Energizers</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {(selectedProfile?.energizers || []).map((item, idx) => (
                            <div key={`energizer-${idx}`} className="rounded-md border p-2">
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                            </div>
                          ))}
                          {!selectedProfile?.energizers?.length && (
                            <p className="text-sm text-muted-foreground">No energizers listed.</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Strengths</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {(selectedProfile?.strengths || []).map((item, idx) => (
                            <div key={`strength-${idx}`} className="rounded-md border p-2">
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                            </div>
                          ))}
                          {!selectedProfile?.strengths?.length && (
                            <p className="text-sm text-muted-foreground">No strengths listed.</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Values</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {(selectedProfile?.values || []).map((item, idx) => (
                            <div key={`value-${idx}`} className="rounded-md border p-2">
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                            </div>
                          ))}
                          {!selectedProfile?.values?.length && (
                            <p className="text-sm text-muted-foreground">No values listed.</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-8">No result selected.</p>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="answers" className="flex-1 mt-4 px-6 pb-6 overflow-hidden">
              <ScrollArea className="h-full pr-4">
                {selectedResult ? (
                  <div className="space-y-6">
                    {/* Assessment Answers Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <ClipboardList className="h-5 w-5 text-blue-500" />
                        <h3 className="text-lg font-semibold">Assessment Answers</h3>
                      </div>

                      {/* Q1: Energy & Flow Discovery */}
                      {selectedResult.answers?.q1_flow && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Q1: Energy & Flow Discovery</CardTitle>
                            <CardDescription>What activity makes time fly?</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-1">Description:</p>
                              <p className="text-sm">{selectedResult.answers.q1_flow.description}</p>
                            </div>
                            {selectedResult.answers.q1_flow.activities?.length > 0 && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Activities:</p>
                                <div className="flex flex-wrap gap-2">
                                  {selectedResult.answers.q1_flow.activities.map((activity, idx) => (
                                    <Badge key={`q1-activity-${idx}`} variant="secondary">
                                      {activity}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {selectedResult.answers.q1_flow.engagement_factors && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Engagement Factors:</p>
                                <p className="text-sm">{selectedResult.answers.q1_flow.engagement_factors}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* Q2: Zone Grid */}
                      {selectedResult.answers?.q2_zone_grid && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Q2: Zone Grid</CardTitle>
                            <CardDescription>Interest vs Capability matrix</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {selectedResult.answers.q2_zone_grid.items?.map((item, idx) => (
                                <div key={`q2-item-${idx}`} className="flex items-center justify-between p-2 border rounded-md">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{item.domain}</p>
                                    {item.exposure_level && (
                                      <p className="text-xs text-muted-foreground">
                                        Exposure: {item.exposure_level}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-4 text-sm">
                                    <div className="text-center">
                                      <p className="text-xs text-muted-foreground">Interest</p>
                                      <p className="font-semibold">{item.interest}/10</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs text-muted-foreground">Capability</p>
                                      <p className="font-semibold">{item.capability}/10</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Q3: Work Style */}
                      {selectedResult.answers?.q3_work_style && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Q3: Work Style Preferences</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="flex justify-between items-center p-2 border rounded-md">
                                <span className="text-sm font-medium">Indoor/Outdoor:</span>
                                <Badge variant="outline">{selectedResult.answers.q3_work_style.indoor_outdoor}</Badge>
                              </div>
                              <div className="flex justify-between items-center p-2 border rounded-md">
                                <span className="text-sm font-medium">Structure:</span>
                                <Badge variant="outline">{selectedResult.answers.q3_work_style.structured_flexible}</Badge>
                              </div>
                              <div className="flex justify-between items-center p-2 border rounded-md">
                                <span className="text-sm font-medium">Work Mode:</span>
                                <Badge variant="outline">{selectedResult.answers.q3_work_style.solo_team}</Badge>
                              </div>
                              <div className="flex justify-between items-center p-2 border rounded-md">
                                <span className="text-sm font-medium">Learning Style:</span>
                                <Badge variant="outline">{selectedResult.answers.q3_work_style.hands_on_theory}</Badge>
                              </div>
                              <div className="flex justify-between items-center p-2 border rounded-md">
                                <span className="text-sm font-medium">Pace:</span>
                                <Badge variant="outline">{selectedResult.answers.q3_work_style.steady_fast}</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Q4: Reputation */}
                      {selectedResult.answers?.q4_reputation && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Q4: Reputation</CardTitle>
                            <CardDescription>What people say you're good at (Top 3)</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              {selectedResult.answers.q4_reputation.map((item, idx) => (
                                <Badge key={`q4-${idx}`} variant="default" className="text-sm">
                                  {idx + 1}. {item}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Q5: Proud Moment */}
                      {selectedResult.answers?.q5_proud && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Q5: Proud Moment</CardTitle>
                            <CardDescription>A time you were proud of yourself</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-1">Story:</p>
                              <p className="text-sm">{selectedResult.answers.q5_proud.story}</p>
                            </div>
                            {selectedResult.answers.q5_proud.role_description && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Your Role:</p>
                                <p className="text-sm">{selectedResult.answers.q5_proud.role_description}</p>
                              </div>
                            )}
                            {selectedResult.answers.q5_proud.tags?.length > 0 && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">What Made It Meaningful:</p>
                                <div className="flex flex-wrap gap-2">
                                  {selectedResult.answers.q5_proud.tags.map((tag, idx) => (
                                    <Badge key={`q5-tag-${idx}`} variant="secondary">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* Q6: Secret Weapon */}
                      {selectedResult.answers?.q6_unique && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Q6: Secret Weapon</CardTitle>
                            <CardDescription>Something unique about you (Optional)</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {selectedResult.answers.q6_unique.skipped ? (
                              <p className="text-sm text-muted-foreground italic">Skipped this question</p>
                            ) : (
                              <p className="text-sm">{selectedResult.answers.q6_unique.description}</p>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Chat History Section */}
                    <div className="border-t pt-6 space-y-3">
                      <div className="flex items-center gap-2 mb-4">
                        <MessageSquare className="h-5 w-5 text-purple-500" />
                        <h3 className="text-lg font-semibold">AI Conversation History</h3>
                      </div>
                      {selectedResult.chat_history?.length ? (
                        selectedResult.chat_history.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted border"
                              }`}
                            >
                              <p className="text-xs opacity-70 mb-1">
                                {msg.role === "user" ? "Student" : "AI Assistant"}
                              </p>
                              {msg.content}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground py-8">
                          No chat history available for this result.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-8">No result selected.</p>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="chat" className="flex-1 mt-4 px-6 pb-6 overflow-hidden">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-3">
                  {selectedResult?.chat_history?.length ? (
                    selectedResult.chat_history.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted border"
                          }`}
                        >
                          <p className="text-xs opacity-70 mb-1">
                            {msg.role === "user" ? "Student" : "AI Assistant"}
                          </p>
                          {msg.content}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground py-8">
                      No chat history available for this result.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
