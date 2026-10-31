"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import {
  ADMIN_USER_ROLES,
  ROLE_LABELS,
  adminUsersQueryToParams,
  normalizeSearch,
  parseAdminUsersQuery,
  userDisplayName,
  type AdminUserRole,
  type AdminUserRow,
  type AdminUsersPage,
  type AdminUsersQuery,
} from "@/lib/supabase/admin-users";
import { cn } from "@/lib/utils";
import { RoleBadges, RoleManagementDialog } from "./RoleManagementDialog";

const SEARCH_DEBOUNCE_MS = 300;

async function readError(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null);
  return (body && typeof body.error === "string" && body.error) || fallback;
}


function formatJoined(iso: string | null): string {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// URL state
// ---------------------------------------------------------------------------

function useUsersUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramString = searchParams.toString();
  const query = useMemo(() => parseAdminUsersQuery(new URLSearchParams(paramString)), [paramString]);

  // Build on the pending request: a filter picked while a search is still
  // navigating must not drop that search.
  const mergeQuery = usePendingQuery(query, paramString);
  const setQuery = useCallback(
    (patch: Partial<AdminUsersQuery>) => {
      const qs = adminUsersQueryToParams(mergeQuery(patch)).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [mergeQuery, pathname, router],
  );

  return { query, setQuery };
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface ListState {
  data: AdminUsersPage | null;
  error: string | null;
  loading: boolean;
}

function useUsersPage(listParams: string) {
  const [state, setState] = useState<ListState>({ data: null, error: null, loading: true });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetch(`/api/admin/users${listParams ? `?${listParams}` : ""}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, "Could not load users"));
        return (await response.json()) as AdminUsersPage;
      })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState((prev) => ({
          data: prev.data,
          error: error instanceof Error ? error.message : "Could not load users",
          loading: false,
        }));
      });

    return () => controller.abort();
  }, [listParams, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}

/** The user behind `?id=`: shown from the current page at once, then refreshed. */
function useSelectedUser(id: string | null, pageUsers: AdminUserRow[] | undefined, onMissing: () => void) {
  const [user, setUser] = useState<AdminUserRow | null>(null);
  const [nonce, setNonce] = useState(0);
  const pageUsersRef = useRef(pageUsers);
  pageUsersRef.current = pageUsers;
  const onMissingRef = useRef(onMissing);
  onMissingRef.current = onMissing;

  useEffect(() => {
    // Keep the last user while the dialog animates closed.
    if (!id) return;
    const fromPage = pageUsersRef.current?.find((u) => u.id === id);
    setUser((prev) => (prev?.id === id ? prev : fromPage ?? null));

    const controller = new AbortController();
    fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (response.status === 404) {
          toast.error("That user no longer exists");
          onMissingRef.current();
          return;
        }
        if (!response.ok) throw new Error(await readError(response, "Could not load this user"));
        const body = (await response.json()) as { user: AdminUserRow };
        setUser(body.user);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        toast.error(error instanceof Error ? error.message : "Could not load this user");
      });

    return () => controller.abort();
  }, [id, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  return { user, refresh };
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function UserFilters({
  search,
  onSearchChange,
  role,
  onRoleChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  role: AdminUserRole | null;
  onRoleChange: (role: AdminUserRole | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="text"
          inputMode="search"
          aria-label="Search users by name, username or email"
          placeholder="Search name, username or email"
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
      <Select value={role ?? "all"} onValueChange={(value) => onRoleChange(value === "all" ? null : (value as AdminUserRole))}>
        <SelectTrigger className="h-11 sm:w-48" aria-label="Filter by role">
          <SelectValue placeholder="All roles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All roles</SelectItem>
          {ADMIN_USER_ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {ROLE_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SortableJoinedHeader({
  sort,
  onToggle,
}: {
  sort: AdminUsersQuery["sort"];
  onToggle: () => void;
}) {
  const Icon = sort === "newest" ? ArrowDown : ArrowUp;
  return (
    <TableHead aria-sort={sort === "newest" ? "descending" : "ascending"} className="whitespace-nowrap">
      <button
        type="button"
        onClick={onToggle}
        className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 font-medium hover:text-foreground active:text-foreground"
      >
        Joined
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">{sort === "newest" ? "newest first" : "oldest first"}, change order</span>
      </button>
    </TableHead>
  );
}

function UsersTable({
  users,
  sort,
  onToggleSort,
  onEdit,
  busy,
}: {
  users: AdminUserRow[];
  sort: AdminUsersQuery["sort"];
  onToggleSort: () => void;
  onEdit: (user: AdminUserRow) => void;
  busy: boolean;
}) {
  return (
    <div
      className={cn("overflow-x-auto rounded-lg border transition-opacity", busy && "opacity-60")}
      aria-busy={busy}
    >
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Roles</TableHead>
            <SortableJoinedHeader sort={sort} onToggle={onToggleSort} />
            <TableHead className="w-24">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className="hover:bg-muted/40 active:bg-muted/60">
              <TableCell>
                <div className="font-medium">{userDisplayName(user)}</div>
                <div className="text-sm text-muted-foreground">
                  {user.username ? `@${user.username}` : "No username"}
                </div>
              </TableCell>
              <TableCell className="text-sm">{user.email ?? <span className="text-muted-foreground">No email</span>}</TableCell>
              <TableCell>
                <RoleBadges roles={user.roles} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {formatJoined(user.created_at)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 active:bg-accent"
                  onClick={() => onEdit(user)}
                  aria-label={`Edit ${userDisplayName(user)}`}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

export function AdminUserManagement({ currentUserId }: { currentUserId: string }) {
  const { query, setQuery } = useUsersUrlState();
  const listParams = adminUsersQueryToParams(query, { includeId: false }).toString();
  const { data, error, loading, reload } = useUsersPage(listParams);

  const [search, setSearch] = useUrlSearchDraft(query.q, (q) => setQuery({ q, page: 1 }), {
    delayMs: SEARCH_DEBOUNCE_MS,
    normalize: normalizeSearch,
  });

  const closeDialog = useCallback(() => setQuery({ id: null }), [setQuery]);
  const { user: selectedUser, refresh: refreshSelected } = useSelectedUser(query.id, data?.users, closeDialog);

  const handleChanged = useCallback(() => {
    refreshSelected();
    reload();
  }, [refreshSelected, reload]);

  const hasFilters = Boolean(query.q || query.role);
  const users = data?.users ?? [];

  let body: ReactNode;
  if (!data && loading) {
    body = <AdminLoading rows={8} label="Loading users" />;
  } else if (error && !data) {
    body = <AdminErrorState title="Could not load users" message={error} onRetry={reload} retrying={loading} />;
  } else if (users.length === 0) {
    body = (
      <AdminEmptyState
        title={hasFilters ? "No users match these filters" : "No users yet"}
        description={hasFilters ? "Try a shorter search or another role." : undefined}
        action={
          hasFilters ? (
            <Button
              variant="outline"
              className="min-h-11 active:bg-accent"
              onClick={() => {
                setSearch("");
                setQuery({ q: "", role: null, page: 1 });
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
        {error && (
          <AdminErrorState title="Could not refresh users" message={error} onRetry={reload} retrying={loading} />
        )}
        <UsersTable
          users={users}
          sort={query.sort}
          onToggleSort={() => setQuery({ sort: query.sort === "newest" ? "oldest" : "newest", page: 1 })}
          onEdit={(user) => setQuery({ id: user.id })}
          busy={loading}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <UserFilters
        search={search}
        onSearchChange={setSearch}
        role={query.role}
        onRoleChange={(role) => setQuery({ role, page: 1 })}
      />

      {body}

      {data && (
        <AdminPagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          pageSize={data.pageSize}
          noun={["user", "users"]}
          label="Users pages"
          onPageChange={(page) => setQuery({ page })}
        />
      )}

      <RoleManagementDialog
        open={query.id !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        user={selectedUser}
        currentUserId={currentUserId}
        onChanged={handleChanged}
      />
    </div>
  );
}
