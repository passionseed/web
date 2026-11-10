"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { LobbyAccessTier, MapLobbyWithCount } from "@/types/lobby";
import { Copy, Check, Users, Plus, Lock } from "lucide-react";

/** Two-state tier picker. Micro is the free tier: first island only. */
function TierToggle({
  value,
  onChange,
  disabled,
  size = "md",
}: {
  value: LobbyAccessTier;
  onChange: (tier: LobbyAccessTier) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1.5 text-xs";

  return (
    <div className="inline-flex rounded-md border border-white/10 bg-black/20 p-0.5">
      {(["full", "micro"] as LobbyAccessTier[]).map((tier) => (
        <button
          key={tier}
          type="button"
          disabled={disabled}
          onClick={() => onChange(tier)}
          aria-pressed={value === tier}
          className={`${pad} rounded transition-colors disabled:opacity-50 ${
            value === tier
              ? "bg-amber-500/20 text-amber-200"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {tier === "full" ? "Full" : "Micro (free)"}
        </button>
      ))}
    </div>
  );
}

interface LobbyListProps {
  mapId: string;
  onSelect: (lobbyId: string) => void;
}

export function LobbyList({ mapId, onSelect }: LobbyListProps) {
  const [lobbies, setLobbies] = useState<MapLobbyWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLobbyName, setNewLobbyName] = useState("");
  const [newLobbyTier, setNewLobbyTier] = useState<LobbyAccessTier>("full");
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [togglingLobbyId, setTogglingLobbyId] = useState<string | null>(null);
  const [tierLobbyId, setTierLobbyId] = useState<string | null>(null);

  const loadLobbies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/lobbies?mapId=${encodeURIComponent(mapId)}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setLobbies(data.lobbies ?? []);
    } catch (error) {
      console.error("Error loading lobbies:", error);
      toast.error("Could not load lobbies", {
        description: error instanceof Error ? error.message : undefined,
      });
      setLobbies([]);
    } finally {
      setLoading(false);
    }
  }, [mapId]);

  useEffect(() => {
    loadLobbies();
  }, [loadLobbies]);

  const handleCreateLobby = async () => {
    const name = newLobbyName.trim();
    if (!name) {
      toast.error("Name the lobby first");
      return;
    }

    try {
      setCreating(true);
      const response = await fetch("/api/admin/lobbies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapId, name, accessTier: newLobbyTier }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setNewLobbyName("");
      toast.success("Lobby created", {
        description: data.lobby?.join_code ? `Join code: ${data.lobby.join_code}` : undefined,
      });
      // Refresh the list so the new lobby appears immediately
      await loadLobbies();
    } catch (error) {
      console.error("Error creating lobby:", error);
      toast.error("Could not create the lobby", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleChangeTier = async (
    lobbyId: string,
    accessTier: LobbyAccessTier
  ) => {
    try {
      setTierLobbyId(lobbyId);
      const response = await fetch("/api/admin/lobbies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lobbyId, accessTier }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      setLobbies((prev) =>
        prev.map((l) => (l.id === lobbyId ? { ...l, access_tier: accessTier } : l))
      );
      toast.success(accessTier === "micro" ? "Switched to Micro" : "Switched to Full", {
        description:
          accessTier === "micro"
            ? "Members now see the first island only."
            : "Members now see the whole map.",
      });
    } catch (error) {
      console.error("Error updating lobby tier:", error);
      toast.error("Could not change the tier", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setTierLobbyId(null);
    }
  };

  const handleToggleOpen = async (lobbyId: string, currentIsOpen: boolean) => {
    try {
      setTogglingLobbyId(lobbyId);
      const response = await fetch("/api/admin/lobbies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lobbyId, isOpen: !currentIsOpen }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Optimistically update local state
      setLobbies((prev) =>
        prev.map((l) => (l.id === lobbyId ? { ...l, is_open: !currentIsOpen } : l))
      );
    } catch (error) {
      console.error("Error updating lobby:", error);
      toast.error("Could not update the lobby", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setTogglingLobbyId(null);
    }
  };

  /** The link students open: the map gate with the code prefilled. */
  const buildJoinLink = useCallback(
    (code: string) =>
      `${window.location.origin}/map/${mapId}?code=${encodeURIComponent(code)}`,
    [mapId]
  );

  const handleCopyLink = async (code: string) => {
    try {
      await navigator.clipboard.writeText(buildJoinLink(code));
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      toast.success("Join link copied", {
        description: "Paste it to invite students straight into this room.",
      });
    } catch {
      toast.error("Could not copy the link");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="h-10 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create new lobby */}
      <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="New lobby name..."
          value={newLobbyName}
          onChange={(e) => setNewLobbyName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreateLobby();
          }}
          disabled={creating}
          className="flex-1"
        />
        <Button onClick={handleCreateLobby} disabled={creating || !newLobbyName.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          {creating ? "Creating..." : "New lobby"}
        </Button>
      </div>
        <div className="flex items-center gap-2">
          <TierToggle
            value={newLobbyTier}
            onChange={setNewLobbyTier}
            disabled={creating}
          />
          <span className="text-xs text-slate-400">
            {newLobbyTier === "micro"
              ? "Members see the first island only."
              : "Members see the whole map."}
          </span>
        </div>
      </div>

      {/* Lobbies list */}
      {lobbies.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No lobbies for this map yet.
        </div>
      ) : (
        <div className="space-y-2">
          {lobbies.map((lobby) => (
            <div
              key={lobby.id}
              className="ei-card p-4 cursor-pointer"
              onClick={() => onSelect(lobby.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(lobby.id);
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-white truncate">{lobby.name}</div>
                    {lobby.access_tier === "micro" && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-200">
                        <Lock className="h-2.5 w-2.5" />
                        Micro
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {/* Join code with copy button */}
                    <div className="flex items-center gap-1.5">
                      <code className="text-mono text-xs bg-black/30 px-1.5 py-0.5 rounded text-amber-300/80">
                        {lobby.join_code}
                      </code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLink(lobby.join_code);
                        }}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
                        aria-label="Copy join link"
                        title="Copy join link"
                      >
                        {copiedCode === lobby.join_code ? (
                          <>
                            <Check className="h-3 w-3 text-green-400" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy link
                          </>
                        )}
                      </button>
                    </div>
                    {/* Member count */}
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Users className="h-3 w-3" />
                      <span>{lobby.member_count}</span>
                    </div>
                  </div>
                </div>

                {/* Open/closed switch */}
                <div
                  className="flex items-center gap-3"
                  onClick={(e) => e.stopPropagation()}
                  role="none"
                >
                  <TierToggle
                    value={lobby.access_tier}
                    onChange={(tier) => handleChangeTier(lobby.id, tier)}
                    disabled={tierLobbyId === lobby.id}
                    size="sm"
                  />
                  <span className="text-xs text-slate-400">
                    {lobby.is_open ? "Open" : "Closed"}
                  </span>
                  <Switch
                    checked={lobby.is_open}
                    onCheckedChange={() => handleToggleOpen(lobby.id, lobby.is_open)}
                    disabled={togglingLobbyId === lobby.id}
                    aria-label={`Toggle ${lobby.name} open state`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
