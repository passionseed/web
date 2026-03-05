import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Rocket } from "lucide-react";
import { registerAppBetaUser } from "@/actions/app-beta";

export const dynamic = "force-dynamic";

export default function AppBetaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:text-white">
            <Link href="/" aria-label="Go back to home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>

        <div className="mx-auto max-w-2xl">
          <Card className="border-white/10 bg-slate-900/80 text-white">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-3xl">Join the Beta</CardTitle>
              <CardDescription className="text-slate-300">
                Sign up for early access to Passion Seed apps.
              </CardDescription>
              <div className="mx-auto mt-4 flex items-center gap-2 text-sm text-emerald-300">
                <Rocket className="h-4 w-4" />
                No login required
              </div>
            </CardHeader>

            <CardContent>
              <form action={registerAppBetaUser} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full name</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    type="text"
                    required
                    placeholder="Your full name"
                    className="bg-slate-950 border-white/15"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="bg-slate-950 border-white/15"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number (optional)</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+66 81 234 5678"
                    className="bg-slate-950 border-white/15"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referral">How did you hear about us?</Label>
                  <Input
                    id="referral"
                    name="referral"
                    type="text"
                    placeholder="Instagram, friend, search, etc."
                    className="bg-slate-950 border-white/15"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motivation">Why do you want to join?</Label>
                  <Textarea
                    id="motivation"
                    name="motivation"
                    required
                    rows={5}
                    placeholder="Tell us what you hope to get out of the beta."
                    className="bg-slate-950 border-white/15"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Register for Beta
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
