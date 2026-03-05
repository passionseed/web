import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function AppBetaSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-xl">
          <Card className="border-white/10 bg-slate-900/80 text-white text-center">
            <CardHeader>
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-300" />
              </div>
              <CardTitle className="text-2xl">You are in!</CardTitle>
              <CardDescription className="text-slate-300">
                Thanks for registering for the Passion Seed beta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-300">
                We&apos;ll review your application and follow up with beta access details soon.
              </p>
              <Button asChild className="w-full">
                <Link href="/">Return Home</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
