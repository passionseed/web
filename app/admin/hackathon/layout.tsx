import { ReactNode } from "react";
import { HackathonNav } from "@/components/admin/HackathonNav";

export default function AdminHackathonLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold">Hackathon</h2>
        <p className="text-sm text-muted-foreground">
          Navigate hackathon workflows by dedicated pages.
        </p>
      </header>
      <HackathonNav />
      {children}
    </div>
  );
}
