"use client";

import { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Mail, X, Send, Eye, Users, FileText } from "lucide-react";
import { TEMPLATE_VARIABLES, renderTemplate, EmailTemplateVars } from "@/lib/hackathon/email";

interface Participant {
  id: string;
  name: string;
  email: string;
  track: string;
  university: string;
  grade_level: string;
  experience_level: number;
  role: string;
  team_name: string;
  team_status: "has_team" | "no_team" | "waitlist";
  submissions: Array<{ activity: string; status: string }>;
}

interface FilterOptions {
  tracks: string[];
  teamStatuses: string[];
  submissionStatuses: string[];
  activityTitles: string[];
}

export function AdminHackathonEmailSender() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    tracks: [],
    teamStatuses: [],
    submissionStatuses: [],
    activityTitles: [],
  });
  const [counts, setCounts] = useState({ total: 0, filtered: 0 });
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [selectedTeamStatuses, setSelectedTeamStatuses] = useState<string[]>([]);
  const [selectedActivitySubmissions, setSelectedActivitySubmissions] = useState<string[]>([]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [subjectTemplate, setSubjectTemplate] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [lastFocused, setLastFocused] = useState<"subject" | "body">("body");
  
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    fetchData();
  }, [selectedTracks, selectedTeamStatuses, selectedActivitySubmissions, debouncedSearch]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTracks.length) params.set("track", selectedTracks.join(","));
      if (selectedTeamStatuses.length) params.set("teamStatus", selectedTeamStatuses.join(","));
      if (selectedActivitySubmissions.length) params.set("activitySubmission", selectedActivitySubmissions.join(","));
      if (debouncedSearch) params.set("search", debouncedSearch);

      const response = await fetch(`/api/admin/hackathon/email-sender?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setParticipants(data.participants || []);
        if (data.filterOptions) setFilterOptions(data.filterOptions);
        if (data.counts) setCounts(data.counts);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === participants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(participants.map((p) => p.id)));
    }
  }

  function handleFilterChange(
    value: string,
    state: string[],
    setState: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    if (!state.includes(value)) {
      setState([...state, value]);
    }
  }

  function removeFilter(
    value: string,
    state: string[],
    setState: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    setState(state.filter((item) => item !== value));
  }

  function insertVariable(variableKey: string) {
    const textToInsert = `{{${variableKey}}}`;
    const targetRef = lastFocused === "subject" ? subjectRef : bodyRef;
    const targetState = lastFocused === "subject" ? subjectTemplate : bodyTemplate;
    const targetSetState = lastFocused === "subject" ? setSubjectTemplate : setBodyTemplate;

    if (targetRef.current) {
      const start = targetRef.current.selectionStart || 0;
      const end = targetRef.current.selectionEnd || 0;
      const newValue = targetState.substring(0, start) + textToInsert + targetState.substring(end);
      targetSetState(newValue);
      
      setTimeout(() => {
        if (targetRef.current) {
          targetRef.current.focus();
          targetRef.current.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
        }
      }, 0);
    } else {
      targetSetState(targetState + textToInsert);
    }
  }

  async function handleSend() {
    if (selectedIds.size === 0 || !subjectTemplate.trim() || !bodyTemplate.trim()) return;

    setSending(true);
    setSendResult(null);

    try {
      const response = await fetch("/api/admin/hackathon/email-sender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientIds: Array.from(selectedIds),
          subjectTemplate,
          bodyTemplate,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSendResult({
          sent: data.sent || 0,
          failed: data.failed || 0,
          errors: data.errors || [],
        });
      } else {
        alert(data.error || "Failed to send emails");
      }
    } catch (error) {
      console.error("Error sending emails:", error);
      alert("An error occurred while sending emails");
    } finally {
      setSending(false);
      setConfirmDialogOpen(false);
    }
  }

  const allSelected = selectedIds.size === participants.length && participants.length > 0;
  const someSelected = selectedIds.size > 0 && selectedIds.size < participants.length;
  const selectAllChecked = allSelected ? true : someSelected ? "indeterminate" : false;

  const previewParticipant = participants.find((p) => selectedIds.has(p.id)) || participants[0];
  const previewVars: EmailTemplateVars = previewParticipant
    ? {
        name: previewParticipant.name,
        email: previewParticipant.email,
        track: previewParticipant.track,
        university: previewParticipant.university,
        grade_level: previewParticipant.grade_level,
        experience_level: previewParticipant.experience_level,
        team_name: previewParticipant.team_name,
        role: previewParticipant.role,
      }
    : {
        name: "Jane Doe",
        email: "jane@example.com",
        track: "University Track",
        university: "Example University",
        grade_level: "Year 3",
        experience_level: 5,
        team_name: "Hackers",
        role: "Frontend",
      };

  const renderedSubject = renderTemplate(subjectTemplate || "Subject Preview", previewVars);
  const renderedBody = renderTemplate(bodyTemplate || "Body Preview", previewVars);

  return (
    <div className="space-y-4">
      {sendResult && (
        <Card className={sendResult.failed > 0 ? "border-orange-500" : "border-green-500"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Send Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className="font-bold text-green-500">{sendResult.sent} sent successfully</span>.{" "}
              {sendResult.failed > 0 && (
                <span className="font-bold text-red-500">{sendResult.failed} failed</span>
              )}
            </p>
            {sendResult.errors.length > 0 && (
              <div className="mt-2 text-xs text-red-500 bg-red-500/10 p-2 rounded">
                {sendResult.errors.map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setSendResult(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5" />
                Filter Participants
              </CardTitle>
              <CardDescription>
                Target specific groups of participants for your email blast. ({counts.filtered} of {counts.total} match)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Track</Label>
                  <Select onValueChange={(val) => handleFilterChange(val, selectedTracks, setSelectedTracks)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add Track..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions.tracks.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedTracks.map((t) => (
                      <Badge key={t} variant="secondary" className="flex items-center gap-1">
                        {t}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter(t, selectedTracks, setSelectedTracks)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Team Status</Label>
                  <Select onValueChange={(val) => handleFilterChange(val, selectedTeamStatuses, setSelectedTeamStatuses)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add Team Status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions.teamStatuses.map((t) => (
                        <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedTeamStatuses.map((t) => (
                      <Badge key={t} variant="secondary" className="flex items-center gap-1">
                        {t.replace("_", " ")}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter(t, selectedTeamStatuses, setSelectedTeamStatuses)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Activity / Submission</Label>
                  <Select onValueChange={(val) => handleFilterChange(val, selectedActivitySubmissions, setSelectedActivitySubmissions)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add Activity filter..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="submitted" className="font-semibold text-blue-500">Status: Submitted</SelectItem>
                      <SelectItem value="pending_review" className="font-semibold text-yellow-500">Status: Pending Review</SelectItem>
                      <SelectItem value="passed" className="font-semibold text-green-500">Status: Passed</SelectItem>
                      <SelectItem value="failed" className="font-semibold text-red-500">Status: Failed</SelectItem>
                      <SelectItem value="not_started" className="font-semibold text-gray-500">Status: Not Started</SelectItem>
                      {filterOptions.activityTitles.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedActivitySubmissions.map((t) => (
                      <Badge key={t} variant="secondary" className="flex items-center gap-1">
                        {t.replace("_", " ")}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter(t, selectedActivitySubmissions, setSelectedActivitySubmissions)} />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search participants by name, email, or team..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Select Recipients
                  </CardTitle>
                  <CardDescription>
                    {selectedIds.size} of {participants.length} participants selected
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="rounded-md border max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox checked={selectAllChecked} onCheckedChange={toggleSelectAll} />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Track</TableHead>
                        <TableHead>Team Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                            No participants match the current filters
                          </TableCell>
                        </TableRow>
                      ) : (
                        participants.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(p.id)}
                                onCheckedChange={() => toggleSelection(p.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{p.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{p.track}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={p.team_status === "has_team" ? "default" : p.team_status === "waitlist" ? "secondary" : "outline"}
                                className={p.team_status === "has_team" ? "bg-green-500 hover:bg-green-600" : ""}
                              >
                                {p.team_status.replace("_", " ")}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Email Template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Variables</Label>
                <div className="flex flex-wrap gap-1">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <Badge 
                      key={v.key} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => insertVariable(v.key)}
                    >
                      {v.label}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Click a variable to insert at cursor.</p>
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Input 
                  ref={subjectRef}
                  value={subjectTemplate}
                  onChange={(e) => setSubjectTemplate(e.target.value)}
                  onFocus={() => setLastFocused("subject")}
                  placeholder="Welcome to {{team_name}}!"
                />
              </div>

              <div className="space-y-2">
                <Label>Body (HTML supported)</Label>
                <Textarea 
                  ref={bodyRef}
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  onFocus={() => setLastFocused("body")}
                  placeholder="Hi {{name}},<br/><br/>Welcome to the hackathon..."
                  className="min-h-[200px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
              <CardDescription>
                {previewParticipant ? `Previewing for ${previewParticipant.name}` : "Preview with sample data"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border p-4 space-y-4 bg-muted/30">
                <div>
                  <div className="text-xs text-muted-foreground font-semibold mb-1">SUBJECT</div>
                  <div className="font-medium">{renderedSubject || "—"}</div>
                </div>
                <div className="border-t pt-2">
                  <div className="text-xs text-muted-foreground font-semibold mb-1">BODY</div>
                  <div 
                    className="text-sm prose prose-sm max-w-none break-words whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: renderedBody || "—" }}
                  />
                </div>
              </div>

              <Button 
                className="w-full mt-4" 
                size="lg"
                disabled={selectedIds.size === 0 || !subjectTemplate.trim() || !bodyTemplate.trim()}
                onClick={() => setConfirmDialogOpen(true)}
              >
                <Send className="mr-2 h-4 w-4" />
                Send to {selectedIds.size} Participants
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Email Send</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>You are about to send an email to <strong>{selectedIds.size} participants</strong>.</p>
            <p className="text-sm text-muted-foreground mt-2">This action cannot be undone. Please ensure your template is correct.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Confirm & Send
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
