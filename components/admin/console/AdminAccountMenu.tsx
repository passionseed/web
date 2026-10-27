"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  LayoutDashboard,
  LogOut,
  PenTool,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/utils/supabase/client";

/** The member pages an admin still reaches from the account menu. */
export const ACCOUNT_LINKS: readonly {
  href: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { href: "/profile", label: "My profile", icon: UserRound },
  { href: "/me", label: "Dashboard", icon: LayoutDashboard },
  { href: "/whiteboard", label: "Whiteboards", icon: PenTool },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** First visible character, so Thai names and emoji stay whole. */
export function accountInitial(
  name: string | null,
  email: string | null,
): string {
  const source = name?.trim() || email?.trim() || "Admin";
  return (Array.from(source)[0] ?? "A").toUpperCase();
}

/**
 * Light account menu for the admin shell. Name and email come from the server
 * layout, so opening the admin never fetches a profile or opens a realtime
 * channel from the browser.
 */
export function AdminAccountMenu({
  name,
  email,
}: {
  name: string | null;
  email: string | null;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const display = name?.trim() || email || "Admin";

  const signOut = async () => {
    setSigningOut(true);
    let error: unknown = null;
    try {
      ({ error } = await createClient().auth.signOut());
    } catch (caught) {
      error = caught;
    }
    if (error) {
      setSigningOut(false);
      toast.error("Could not sign out. Try again.");
      return;
    }
    router.replace("/login");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="admin-account-trigger"
          aria-label={`Account menu for ${display}`}
        >
          <span className="admin-account-avatar" aria-hidden="true">
            {accountInitial(name, email)}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="admin-account-content w-64"
      >
        <DropdownMenuLabel className="admin-account-identity">
          <span className="admin-account-name">{display}</span>
          {email && email !== display && (
            <span className="admin-account-email">{email}</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="admin-account-item">
          <a href="/" target="_blank" rel="noopener noreferrer">
            <ArrowUpRight aria-hidden="true" />
            Open website
          </a>
        </DropdownMenuItem>
        {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem key={href} asChild className="admin-account-item">
            <Link href={href}>
              <Icon aria-hidden="true" />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="admin-account-item"
          disabled={signingOut}
          onSelect={(event) => {
            event.preventDefault();
            void signOut();
          }}
        >
          <LogOut aria-hidden="true" />
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
