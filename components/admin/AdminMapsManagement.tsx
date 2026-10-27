"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { DoorOpen, ExternalLink, Search, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoading,
} from "@/components/admin/shared/AdminStates";
import { AdminPagination } from "@/components/admin/shared/AdminPagination";
import { usePendingQuery } from "@/components/admin/shared/usePendingQuery";
import { useUrlSearchDraft } from "@/components/admin/shared/useUrlSearchDraft";
import { useConfirm } from "@/components/admin/shared/useConfirm";
import {
  MAP_VISIBILITIES,
  adminMapsQueryToParams,
  parseAdminMapsQuery,
  type AdminMapRow,
  type AdminMapsPage,
  type AdminMapsQuery,
  type MapVisibility,
} from "@/lib/supabase/admin-maps";
import { normalizeSearch } from "@/lib/supabase/admin-list-params";
import { cn } from "@/lib/utils";
import { LobbyManagerDialog } from "./lobbies/LobbyManagerDialog";

const SEARCH_DEBOUNCE_MS = 300;

const DIFFICULTY_OPTIONS = [
  { value: 1, label: "1, beginner" },
  { value: 2, label: "2, easy" },
  { value: 3, label: "3, medium" },
  { value: 4, label: "4, hard" },
  { value: 5, label: "5, expert" },
] as const;

const VISIBILITY_LABELS: Record<MapVisibility, string> = {
  public: "Public",
  private: "Private",
  team: "Team",
};

async function readError(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null);
  return (body && typeof body.error === "string" && body.error) || fallback;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

// ---------------------------------------------------------------------------
// URL state and data
// ---------------------------------------------------------------------------

function useMapsUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramString = searchParams.toString();
  const query = useMemo(() => parseAdminMapsQuery(new URLSearchParams(paramString)), [paramString]);

  // Build on the pending request: a filter picked while a search is still
  // navigating must not drop that search.
  const mergeQuery = usePendingQuery(query, paramString);
  const setQuery = useCallback(
    (patch: Partial<AdminMapsQuery>) => {
      const qs = adminMapsQueryToParams(mergeQuery(patch)).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [mergeQuery, pathname, router],
  );

  return { query, setQuery };
}

function useMapsPage(listParams: string) {
  const [state, setState] = useState<{ data: AdminMapsPage | null; error: string | null; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetch(`/api/admin/maps${listParams ? `?${listParams}` : ""}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, "Could not load maps"));
        return (await response.json()) as AdminMapsPage;
      })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState((prev) => ({
          data: prev.data,
          error: error instanceof Error ? error.message : "Could not load maps",
          loading: false,
        }));
      });

    return () => controller.abort();
  }, [listParams, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}


// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function MapFilters({
  search,
  onSearchChange,
  visibility,
  onVisibilityChange,
  difficulty,
  onDifficultyChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  visibility: MapVisibility | null;
  onVisibilityChange: (value: MapVisibility | null) => void;
  difficulty: number | null;
  onDifficultyChange: (value: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="text"
          inputMode="search"
          aria-label="Search maps by title, description, category or creator"
          placeholder="Search title, description, category or creator"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-11 pl-9 pr-11"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground active:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <Select
        value={visibility ?? "all"}
        onValueChange={(value) => onVisibilityChange(value === "all" ? null : (value as MapVisibility))}
      >
        <SelectTrigger className="h-11 md:w-40" aria-label="Filter by visibility">
          <SelectValue placeholder="Any visibility" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any visibility</SelectItem>
          {MAP_VISIBILITIES.map((v) => (
            <SelectItem key={v} value={v}>
              {VISIBILITY_LABELS[v]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={difficulty ? String(difficulty) : "all"}
        onValueChange={(value) => onDifficultyChange(value === "all" ? null : Number(value))}
      >
        <SelectTrigger className="h-11 md:w-40" aria-label="Filter by difficulty">
          <SelectValue placeholder="Any difficulty" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any difficulty</SelectItem>
          {DIFFICULTY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SelectBox({
  checked,
  onCheckedChange,
  label,
  disabled,
}: {
  checked: boolean | "indeterminate";
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        aria-label={label}
        disabled={disabled}
      />
    </label>
  );
}

function MapRowActions({
  map,
  deleting,
  onLobbies,
  onDelete,
}: {
  map: AdminMapRow;
  deleting: boolean;
  onLobbies: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" className="min-h-11 active:bg-accent" asChild>
        <Link href={`/map/${map.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Open ${map.title} in a new tab`}>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          Open
        </Link>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="min-h-11 active:bg-accent"
        onClick={onLobbies}
        aria-label={`Lobbies for ${map.title}`}
      >
        <DoorOpen className="h-3.5 w-3.5" aria-hidden="true" />
        Lobbies
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="min-h-11 text-destructive hover:bg-destructive/10 hover:text-destructive active:bg-destructive/10"
        onClick={onDelete}
        disabled={deleting}
        aria-label={`Delete ${map.title}`}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        {deleting ? "Deleting" : "Delete"}
      </Button>
    </div>
  );
}

function MapsTable({
  maps,
  selected,
  onToggle,
  onToggleAll,
  deletingId,
  onLobbies,
  onDelete,
  busy,
}: {
  maps: AdminMapRow[];
  selected: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  deletingId: string | null;
  onLobbies: (map: AdminMapRow) => void;
  onDelete: (map: AdminMapRow) => void;
  busy: boolean;
}) {
  const selectedOnPage = maps.filter((m) => selected.has(m.id)).length;
  const allState: boolean | "indeterminate" =
    selectedOnPage === 0 ? false : selectedOnPage === maps.length ? true : "indeterminate";

  return (
    <div className={cn("overflow-x-auto rounded-lg border transition-opacity", busy && "opacity-60")} aria-busy={busy}>
      <Table className="min-w-[880px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 px-1">
              <SelectBox checked={allState} onCheckedChange={onToggleAll} label="Select every map on this page" />
            </TableHead>
            <TableHead>Map</TableHead>
            <TableHead>Creator</TableHead>
            <TableHead>Visibility</TableHead>
            <TableHead>Difficulty</TableHead>
            <TableHead className="text-right">Nodes</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {maps.map((map) => (
            <TableRow
              key={map.id}
              data-state={selected.has(map.id) ? "selected" : undefined}
              className="hover:bg-muted/40 active:bg-muted/60"
            >
              <TableCell className="px-1">
                <SelectBox
                  checked={selected.has(map.id)}
                  onCheckedChange={(checked) => onToggle(map.id, checked)}
                  label={`Select ${map.title}`}
                />
              </TableCell>
              <TableCell className="max-w-[320px]">
                <div className="font-medium">{map.title}</div>
                {map.description && (
                  <div className="line-clamp-1 text-sm text-muted-foreground">{map.description}</div>
                )}
                {map.category && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    {map.category}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-sm">{map.creator_name}</TableCell>
              <TableCell>
                {map.visibility ? (
                  <Badge variant={map.visibility === "public" ? "secondary" : "outline"}>
                    {VISIBILITY_LABELS[map.visibility]}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Not set</span>
                )}
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                {map.difficulty ? `Level ${map.difficulty}` : <span className="text-muted-foreground">Not set</span>}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">{map.node_count.toLocaleString()}</TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {formatDate(map.created_at)}
              </TableCell>
              <TableCell>
                <MapRowActions
                  map={map}
                  deleting={deletingId === map.id}
                  onLobbies={() => onLobbies(map)}
                  onDelete={() => onDelete(map)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SelectionBar({
  count,
  deleting,
  onClear,
  onDelete,
}: {
  count: number;
  deleting: boolean;
  onClear: () => void;
  onDelete: () => void;
}) {
  if (count === 0) return null;
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-1"
      role="region"
      aria-label="Selected maps"
    >
      <p className="text-sm" aria-live="polite">
        {plural(count, "map", "maps")} selected on this page
      </p>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="min-h-11 active:bg-accent" onClick={onClear} disabled={deleting}>
          Clear selection
        </Button>
        <Button variant="destructive" size="sm" className="min-h-11" onClick={onDelete} disabled={deleting}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {deleting ? "Deleting" : `Delete ${plural(count, "map", "maps")}`}
        </Button>
      </div>
    </div>
  );
}

const DELETE_CONSEQUENCES =
  "their nodes, node content, assessments and quiz questions, and every student's progress, submissions and grades on them. This cannot be undone.";

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

export function AdminMapsManagement() {
  const { query, setQuery } = useMapsUrlState();
  const listParams = adminMapsQueryToParams(query).toString();
  const { data, error, loading, reload } = useMapsPage(listParams);
  const { confirm, confirmDialog } = useConfirm();

  const [search, setSearch] = useUrlSearchDraft(query.q, (q) => setQuery({ q, page: 1 }), {
    delayMs: SEARCH_DEBOUNCE_MS,
    normalize: normalizeSearch,
  });
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [lobbyMap, setLobbyMap] = useState<AdminMapRow | null>(null);

  // A selection only ever covers the rows on screen: drop it when the page or filters change.
  useEffect(() => {
    setSelected(new Set());
  }, [listParams]);

  const maps = useMemo(() => data?.maps ?? [], [data]);
  const selectedCount = maps.filter((m) => selected.has(m.id)).length;
  const hasFilters = Boolean(query.q || query.visibility || query.difficulty);

  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggleAll = (checked: boolean) => setSelected(checked ? new Set(maps.map((m) => m.id)) : new Set());

  const deleteOne = async (map: AdminMapRow) => {
    const ok = await confirm({
      title: `Delete "${map.title}"?`,
      description: `This permanently deletes the map, ${plural(map.node_count, "node", "nodes")}, ${DELETE_CONSEQUENCES}`,
      confirmLabel: "Delete map",
      destructive: true,
    });
    if (!ok) return;

    setDeletingId(map.id);
    try {
      const response = await fetch(`/api/admin/maps/${map.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readError(response, "Could not delete the map"));
      toast.success(`Deleted "${map.title}"`);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(map.id);
        return next;
      });
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the map");
    } finally {
      setDeletingId(null);
    }
  };

  const deleteSelected = async () => {
    const ids = maps.filter((m) => selected.has(m.id)).map((m) => m.id);
    if (ids.length === 0) return;
    const ok = await confirm({
      title: `Delete ${plural(ids.length, "map", "maps")}?`,
      description: `This permanently deletes the selected maps, ${DELETE_CONSEQUENCES}`,
      confirmLabel: `Delete ${plural(ids.length, "map", "maps")}`,
      destructive: true,
    });
    if (!ok) return;

    setBulkDeleting(true);
    const toastId = toast.loading(`Deleting ${plural(ids.length, "map", "maps")}`);
    try {
      const response = await fetch("/api/admin/maps/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const body = (await response.json().catch(() => null)) as
        | { deleted?: string[]; failed?: { id: string }[]; error?: string }
        | null;
      if (!body || (!response.ok && !body.failed)) {
        throw new Error(body?.error || "Could not delete the maps");
      }

      const deleted = body.deleted?.length ?? 0;
      const failedTitles = (body.failed ?? []).map((f) => maps.find((m) => m.id === f.id)?.title ?? "Unknown map");
      if (failedTitles.length === 0) {
        toast.success(`Deleted ${plural(deleted, "map", "maps")}`, { id: toastId });
      } else {
        const shown = failedTitles.slice(0, 3).join(", ");
        const more = failedTitles.length > 3 ? ` and ${failedTitles.length - 3} more` : "";
        const description = `Could not delete: ${shown}${more}`;
        if (deleted > 0) {
          toast.warning(`Deleted ${deleted} of ${ids.length} maps`, { id: toastId, description });
        } else {
          toast.error("No maps were deleted", { id: toastId, description });
        }
      }
      setSelected(new Set());
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the maps", { id: toastId });
    } finally {
      setBulkDeleting(false);
    }
  };

  let body: ReactNode;
  if (!data && loading) {
    body = <AdminLoading rows={10} label="Loading maps" />;
  } else if (error && !data) {
    body = <AdminErrorState title="Could not load maps" message={error} onRetry={reload} retrying={loading} />;
  } else if (maps.length === 0) {
    body = (
      <AdminEmptyState
        title={hasFilters ? "No maps match these filters" : "No maps yet"}
        description={hasFilters ? "Try a shorter search or clear a filter." : undefined}
        action={
          hasFilters ? (
            <Button
              variant="outline"
              className="min-h-11 active:bg-accent"
              onClick={() => {
                setSearch("");
                setQuery({ q: "", visibility: null, difficulty: null, page: 1 });
              }}
            >
              Clear filters
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    body = (
      <>
        {error && <AdminErrorState title="Could not refresh maps" message={error} onRetry={reload} retrying={loading} />}
        <SelectionBar
          count={selectedCount}
          deleting={bulkDeleting}
          onClear={() => setSelected(new Set())}
          onDelete={deleteSelected}
        />
        <MapsTable
          maps={maps}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
          deletingId={deletingId}
          onLobbies={setLobbyMap}
          onDelete={deleteOne}
          busy={loading || bulkDeleting}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <MapFilters
        search={search}
        onSearchChange={setSearch}
        visibility={query.visibility}
        onVisibilityChange={(visibility) => setQuery({ visibility, page: 1 })}
        difficulty={query.difficulty}
        onDifficultyChange={(difficulty) => setQuery({ difficulty, page: 1 })}
      />

      {body}

      {data && (
        <AdminPagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          pageSize={data.pagination.limit}
          noun={["map", "maps"]}
          label="Maps pages"
          onPageChange={(page) => setQuery({ page })}
        />
      )}

      {lobbyMap && (
        <LobbyManagerDialog
          mapId={lobbyMap.id}
          mapTitle={lobbyMap.title}
          open
          onOpenChange={(open) => {
            if (!open) setLobbyMap(null);
          }}
        />
      )}
      {confirmDialog}
    </div>
  );
}
