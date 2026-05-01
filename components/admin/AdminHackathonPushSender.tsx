"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Loader2,
  Search,
  Bell,
  BellRing,
  Send,
  Users,
  TestTube,
} from "lucide-react";

interface TokenInfo {
  id: string;
  platform: string;
  push_token: string;
  last_used_at: string | null;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  track: string;
  team_name: string;
  has_push: boolean;
  platforms: string[];
  tokens: TokenInfo[];
}

export function AdminHackathonPushSender() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [counts, setCounts] = useState({ total: 0, withPush: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    sent: number;
    failed: number;
    noToken: number;
    staleRemoved?: number;
    details?: { platform: string; status: string; error?: string; ticketId?: string }[];
  } | null>(null);

  const [receiptResults, setReceiptResults] = useState<
    { ticketId: string; status: string; error?: string }[] | null
  >(null);
  const [checkingReceipts, setCheckingReceipts] = useState(false);

  const [selfSubscribed, setSelfSubscribed] = useState(false);
  const [testSending, setTestSending] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/admin/hackathon/push-sender?${params}`);
      const data = await res.json();
      if (res.ok) {
        setParticipants(data.participants ?? []);
        setCounts(data.counts ?? { total: 0, withPush: 0 });
      }
    } catch (err) {
      console.error("Failed to fetch participants:", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check if browser already has push subscription
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSelfSubscribed(!!sub);
      });
    });
  }, []);

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const withPush = participants.filter((p) => p.has_push);
    if (selectedIds.size === withPush.length && withPush.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(withPush.map((p) => p.id)));
    }
  }

  async function handleSend() {
    if (selectedIds.size === 0 || !title.trim() || !body.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/hackathon/push-sender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientIds: Array.from(selectedIds),
          title,
          body,
          url: url || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult(data);
      } else {
        alert(data.error || "Failed to send");
      }
    } catch (err) {
      console.error("Send error:", err);
      alert("An error occurred");
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  }

  async function handleTestToSelf() {
    if (!title.trim() || !body.trim()) {
      alert("Enter a title and body first");
      return;
    }

    setTestSending(true);
    try {
      // 1. Register service worker if needed
      const reg = await navigator.serviceWorker.ready;

      // 2. Subscribe to push if not already
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          alert("VAPID public key not configured");
          return;
        }
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        setSelfSubscribed(true);
      }

      // 3. Send test push directly via the subscription (server-side)
      const res = await fetch("/api/admin/hackathon/push-sender/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          title,
          body,
          url: url || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) alert(data.error || "Test failed");
    } catch (err: any) {
      console.error("Test push error:", err);
      if (err?.name === "NotAllowedError") {
        alert("Push notifications are blocked. Please allow them in your browser settings.");
      } else {
        alert("Failed to send test push: " + (err?.message || "Unknown error"));
      }
    } finally {
      setTestSending(false);
    }
  }

  const withPush = participants.filter((p) => p.has_push);
  const allPushSelected =
    selectedIds.size === withPush.length && withPush.length > 0;

  const ticketIds = (sendResult?.details ?? [])
    .map((d) => d.ticketId)
    .filter((id): id is string => !!id);

  async function handleCheckReceipts() {
    if (!ticketIds.length) return;
    setCheckingReceipts(true);
    try {
      const res = await fetch("/api/admin/hackathon/push-sender/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketIds }),
      });
      const data = await res.json();
      if (res.ok) setReceiptResults(data.receipts);
      else alert(data.error || "Failed to check receipts");
    } catch {
      alert("Failed to check receipts");
    } finally {
      setCheckingReceipts(false);
    }
  }
  const somePushSelected =
    selectedIds.size > 0 && selectedIds.size < withPush.length;

  return (
    <div className="space-y-4">
      {sendResult && (
        <Card
          className={
            sendResult.failed > 0 ? "border-orange-500" : "border-green-500"
          }
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BellRing className="h-5 w-5" />
              Push Send Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className="font-bold text-green-500">
                {sendResult.sent} sent
              </span>
              {sendResult.failed > 0 && (
                <span className="font-bold text-red-500 ml-2">
                  {sendResult.failed} failed
                </span>
              )}
              {sendResult.noToken > 0 && (
                <span className="text-muted-foreground ml-2">
                  ({sendResult.noToken} without push token)
                </span>
              )}
              {(sendResult.staleRemoved ?? 0) > 0 && (
                <span className="text-muted-foreground ml-2">
                  · {sendResult.staleRemoved} stale subscriptions removed
                </span>
              )}
            </p>
            {sendResult.details && sendResult.details.length > 0 && (
              <div className="mt-2 rounded border text-xs divide-y">
                {sendResult.details.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                    <Badge variant="outline" className="text-[10px]">{d.platform}</Badge>
                    {d.status === "ok" ? (
                      <span className="text-green-500">✓ Accepted</span>
                    ) : (
                      <span className="text-red-500">✗ {d.error || "Failed"}</span>
                    )}
                    {d.ticketId && (
                      <span className="text-muted-foreground text-[10px] ml-auto font-mono">{d.ticketId}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {ticketIds.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                disabled={checkingReceipts}
                onClick={handleCheckReceipts}
              >
                {checkingReceipts ? (
                  <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Checking...</>
                ) : (
                  "Check Receipts"
                )}
              </Button>
            )}
            {receiptResults && (
              <div className="mt-2 rounded border text-xs divide-y">
                <div className="px-2 py-1.5 font-semibold bg-muted">Expo Receipts</div>
                {receiptResults.map((r) => (
                  <div key={r.ticketId} className="flex items-center gap-2 px-2 py-1.5">
                    <span className="font-mono text-[10px] text-muted-foreground">{r.ticketId}</span>
                    {r.status === "delivered" ? (
                      <Badge className="bg-green-500 text-[10px]">✓ Delivered</Badge>
                    ) : r.status === "pending" ? (
                      <Badge variant="secondary" className="text-[10px]">⏳ Pending</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">✗ {r.error}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => { setSendResult(null); setReceiptResults(null); }}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Left: participant list */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Recipients
              </CardTitle>
              <CardDescription>
                {counts.withPush} of {counts.total} participants have push
                enabled · {selectedIds.size} selected
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or team..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="rounded-md border max-h-[500px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={
                              allPushSelected
                                ? true
                                : somePushSelected
                                  ? "indeterminate"
                                  : false
                            }
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Track</TableHead>
                        <TableHead className="w-[80px]">Push</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground h-24"
                          >
                            No participants found
                          </TableCell>
                        </TableRow>
                      ) : (
                        participants.map((p) => (
                          <TableRow
                            key={p.id}
                            className={
                              !p.has_push ? "opacity-50" : undefined
                            }
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(p.id)}
                                onCheckedChange={() => toggleSelection(p.id)}
                                disabled={!p.has_push}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {p.name}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {p.email}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {p.track}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {p.has_push ? (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Badge className="bg-green-500 hover:bg-green-600 text-xs cursor-pointer">
                                      <Bell className="h-3 w-3 mr-1" />
                                      {p.platforms.join(", ")}
                                    </Badge>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-96 max-h-64 overflow-auto" align="end">
                                    <p className="font-semibold text-sm mb-2">
                                      Push Tokens ({p.tokens.length})
                                    </p>
                                    <div className="space-y-2">
                                      {p.tokens.map((t) => (
                                        <div
                                          key={t.id}
                                          className="rounded border p-2 text-xs space-y-1"
                                        >
                                          <div className="flex items-center justify-between">
                                            <Badge variant="outline" className="text-[10px]">
                                              {t.platform}
                                            </Badge>
                                            {t.last_used_at && (
                                              <span className="text-muted-foreground">
                                                {new Date(t.last_used_at).toLocaleDateString()}
                                              </span>
                                            )}
                                          </div>
                                          <pre className="bg-muted rounded p-1.5 text-[10px] break-all whitespace-pre-wrap max-h-20 overflow-auto">
                                            {t.push_token}
                                          </pre>
                                        </div>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-xs text-muted-foreground"
                                >
                                  None
                                </Badge>
                              )}
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

        {/* Right: compose + test */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BellRing className="h-5 w-5" />
                Compose Notification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="🔥 New announcement!"
                />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Check out the latest update..."
                  className="min-h-[120px]"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Link URL{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="/hackathon"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Test
              </CardTitle>
              <CardDescription>
                Send a test notification to your own browser.
                {selfSubscribed && (
                  <span className="text-green-500 ml-1">
                    ✓ Push subscribed
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                disabled={testSending || !title.trim() || !body.trim()}
                onClick={handleTestToSelf}
              >
                {testSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <TestTube className="mr-2 h-4 w-4" />
                    Send Test to Myself
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Button
            className="w-full"
            size="lg"
            disabled={
              selectedIds.size === 0 || !title.trim() || !body.trim()
            }
            onClick={() => setConfirmOpen(true)}
          >
            <Send className="mr-2 h-4 w-4" />
            Send to {selectedIds.size} Participants
          </Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Push Notification</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <p>
              Send push notification to{" "}
              <strong>{selectedIds.size} participants</strong>?
            </p>
            <div className="rounded-md border p-3 bg-muted text-sm space-y-1">
              <p className="font-semibold">{title}</p>
              <p className="text-muted-foreground">{body}</p>
              {url && (
                <p className="text-xs text-blue-500">→ {url}</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={sending}
            >
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

/** Convert VAPID public key from base64url to Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
