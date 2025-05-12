import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import { LavaFooter } from "@/components/lava-footer";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { CloudCog } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export async function Layout({ children }: LayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log(user);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <MainNav />
          <div className="ml-auto flex items-center space-x-4">
            {user ? (
              <UserNav user={user} />
            ) : (
              <>
                <Button asChild>
                  <a href="/signup">Sign In</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <LavaFooter />
    </div>
  );
}
