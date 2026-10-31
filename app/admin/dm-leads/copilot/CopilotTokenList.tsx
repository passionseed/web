"use client";

import { useState, useTransition } from "react";
import { Copy, KeyRound, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { useConfirm } from "@/components/admin/shared/useConfirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  createCopilotTokenAction,
  revokeCopilotTokenAction,
  type CopilotTokenSummary,
} from "./actions";

interface CopilotTokenListProps {
  initialTokens: CopilotTokenSummary[];
}

/** Shown when a server action throws (network drop, expired session). */
const UNREACHABLE = "ติดต่อเซิร์ฟเวอร์ไม่ได้ ลองอีกครั้ง";

function formatDate(iso: string | null): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

function statusBadge(token: CopilotTokenSummary): { label: string; variant: "default" | "secondary" | "outline" } {
  if (token.revoked_at) return { label: "revoked", variant: "outline" };
  if (Date.parse(token.expires_at) <= Date.now()) return { label: "expired", variant: "outline" };
  return { label: "active", variant: "default" };
}

function RevealedToken({ raw, name, onDismiss }: { raw: string; name: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyRaw = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      toast.error("คัดลอกไม่ได้ เลือกข้อความแล้วคัดลอกเอง");
    }
  };

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-amber-400">
          ⚠️ token ใหม่สำหรับ {name}: เก็บไว้ตอนนี้เลย
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          เราไม่เก็บ raw token ไว้ ปิดการ์ดนี้แล้วจะกู้คืนไม่ได้อีก
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 break-all rounded border bg-background px-3 py-2 font-mono text-xs">
            {raw}
          </code>
          <Button onClick={() => void copyRaw()} variant="outline" className="shrink-0">
            <Copy className="mr-1 h-3 w-3" aria-hidden="true" />
            {copied ? "copied" : "copy"}
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          ปิด
        </Button>
      </CardContent>
    </Card>
  );
}

function TokenRow({
  token,
  revoking,
  onRevoke,
}: {
  token: CopilotTokenSummary;
  revoking: boolean;
  onRevoke: (token: CopilotTokenSummary) => void;
}) {
  const status = statusBadge(token);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2">
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{token.name}</span>
          <Badge variant={status.variant} className="text-[10px]">
            {status.label}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">
          สร้าง {formatDate(token.created_at)} · หมดอายุ {formatDate(token.expires_at)} · ใช้ล่าสุด{" "}
          {formatDate(token.last_used_at)}
        </p>
      </div>
      {!token.revoked_at && (
        <Button variant="outline" size="sm" onClick={() => onRevoke(token)} disabled={revoking}>
          <ShieldOff className="mr-1 h-3 w-3" aria-hidden="true" />
          {revoking ? "กำลัง revoke…" : "revoke"}
        </Button>
      )}
    </div>
  );
}

export function CopilotTokenList({ initialTokens }: CopilotTokenListProps) {
  const [tokens, setTokens] = useState(initialTokens);
  const [name, setName] = useState("");
  const [ttlDays, setTtlDays] = useState(90);
  const [revealed, setRevealed] = useState<{ raw: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, startCreate] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const submitCreate = () => {
    setError(null);
    if (!name.trim()) {
      setError("ตั้งชื่อ token ก่อน (e.g. 'boon macbook')");
      return;
    }
    startCreate(async () => {
      try {
        const result = await createCopilotTokenAction({ name: name.trim(), ttlDays });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setTokens((current) => [result.data.row, ...current]);
        setRevealed({ raw: result.data.raw, name: result.data.row.name });
        setName("");
      } catch {
        setError(UNREACHABLE);
      }
    });
  };

  const onRevoke = async (token: CopilotTokenSummary) => {
    const ok = await confirm({
      title: `Revoke "${token.name}"?`,
      description: "extension ที่ใช้ token นี้จะหยุดทำงานทันที และย้อนกลับไม่ได้ ถ้ายังต้องใช้ ให้ mint token ใหม่",
      confirmLabel: "Revoke",
      destructive: true,
    });
    if (!ok) return;

    setRevokingId(token.id);
    try {
      const result = await revokeCopilotTokenAction(token.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setTokens((current) =>
        current.map((t) => (t.id === token.id ? { ...t, revoked_at: new Date().toISOString() } : t))
      );
      toast.success(`Revoke "${token.name}" แล้ว`);
    } catch {
      toast.error(UNREACHABLE);
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            สร้าง token ใหม่
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-[1fr,160px,auto]">
            <Input
              placeholder="boon macbook"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isCreating}
              maxLength={80}
              aria-label="Token name"
            />
            <Input
              type="number"
              min={1}
              max={365}
              value={ttlDays}
              onChange={(e) => setTtlDays(Math.max(1, Math.min(365, Number(e.target.value) || 90)))}
              disabled={isCreating}
              aria-label="TTL in days"
            />
            <Button onClick={submitCreate} disabled={isCreating}>
              {isCreating ? "กำลังสร้าง…" : "สร้าง token"}
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            token จะหมดอายุตามจำนวนวันที่ตั้ง (ค่าเริ่มต้น 90 วัน) และ revoke ได้ทุกเมื่อ
          </p>
        </CardContent>
      </Card>

      {revealed && (
        <RevealedToken
          key={revealed.raw}
          raw={revealed.raw}
          name={revealed.name}
          onDismiss={() => setRevealed(null)}
        />
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tokens ที่มีอยู่</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tokens.length === 0 && (
            <p className="text-sm text-muted-foreground">ยังไม่มี token สร้างอันแรกด้านบน</p>
          )}
          {tokens.map((token) => (
            <TokenRow
              key={token.id}
              token={token}
              revoking={revokingId === token.id}
              onRevoke={(t) => void onRevoke(t)}
            />
          ))}
        </CardContent>
      </Card>
      {confirmDialog}
    </div>
  );
}
