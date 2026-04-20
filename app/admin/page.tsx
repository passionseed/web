import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminStatsOverview } from "@/components/admin/AdminStatsOverview";
import {
  Activity,
  Compass,
  TestTube,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const quickLinks = [
    {
      href: "/admin/analytics",
      title: "Product Analytics",
      description: "Track retention, activation, and behavior trends.",
      icon: Activity,
    },
    {
      href: "/admin/users",
      title: "User Management",
      description: "Manage user roles and account access.",
      icon: Users,
    },
    {
      href: "/admin/maps",
      title: "Maps Management",
      description: "Inspect and maintain learning maps.",
      icon: Compass,
    },
    {
      href: "/admin/hackathon",
      title: "Hackathon",
      description: "Navigate hackathon operations and participant tools.",
      icon: Trophy,
    },
    {
      href: "/admin/beta",
      title: "Beta Registrations",
      description: "Review and manage beta signups.",
      icon: TestTube,
    },
    {
      href: "/admin/event-tracker",
      title: "Event Tracker",
      description: "Analyze key event activity on the platform.",
      icon: Zap,
    },
  ];

  return (
    <div className="space-y-6">
      <AdminStatsOverview />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Quick Access</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Card className="h-full transition-colors hover:bg-muted/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-md border p-4 text-sm text-muted-foreground">
        Use the top navigation to open each admin area in its own route.
      </section>
    </div>
  );
}