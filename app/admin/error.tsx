"use client";

import { startTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminErrorState } from "@/components/admin/shared/AdminStates";

/** Renders inside the admin shell (layout.tsx), so navigation stays usable. */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  // Server component errors need fresh server data, not just a client re-render.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  useEffect(() => {
    console.error("Admin page failed to render", error);
  }, [error]);

  return (
    <div className="admin-overview">
      <header className="admin-page-heading admin-page-heading-compact">
        <div>
          <p className="admin-eyebrow">SOMETHING WENT WRONG</p>
          <h1>This page could not load</h1>
          <p className="admin-page-description">
            The rest of the admin still works. Try again, or pick another tool from the menu.
          </p>
        </div>
      </header>
      <AdminErrorState
        title="Error while loading this admin page"
        message={
          <>
            {error.message || "Unknown error."}
            {error.digest && (
              <span className="mt-1 block font-mono text-xs">Reference: {error.digest}</span>
            )}
          </>
        }
        onRetry={retry}
      />
      <Link href="/admin" className="admin-quiet-link mt-4">
        <ArrowLeft size={16} aria-hidden="true" /> Back to overview
      </Link>
    </div>
  );
}
