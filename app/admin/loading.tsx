import { AdminLoading } from "@/components/admin/shared/AdminStates";
import { Skeleton } from "@/components/ui/skeleton";

/** Instant feedback inside the shell while a server-rendered tool loads. */
export default function AdminRouteLoading() {
  return (
    <div className="admin-page-loading">
      <div className="admin-page-loading-heading" aria-hidden="true">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-4 h-8 w-72 max-w-full" />
        <Skeleton className="mt-4 h-4 w-[28rem] max-w-full" />
      </div>
      <AdminLoading rows={6} rowClassName="h-12" label="Loading page" />
    </div>
  );
}
