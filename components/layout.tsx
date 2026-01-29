"use client";

import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
// import { LavaFooter } from "@/components/lava-footer";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";

interface LayoutProps {
  children: React.ReactNode;
  user?: User | null;
}

export function Layout({ children, user }: LayoutProps) {
  const pathname = usePathname();
  
  // Hide navbar for profile completion pages
  const hideNavbar = pathname?.includes('finish-profile') || pathname?.includes('complete-profile');

  return (
    <div className="flex min-h-screen flex-col">
      {!hideNavbar && (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container px-4 flex h-16 items-center">
            <MainNav />

            <div className="ml-auto flex items-center space-x-4">
              {user ? (
                <UserNav user={user} />
              ) : (
                <>
                  <Button asChild>
                    <a href="/login">Sign In</a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>
      )}
      <main className="flex-1">{children}</main>
      {/* <LavaFooter /> */}
    </div>
  );
}
