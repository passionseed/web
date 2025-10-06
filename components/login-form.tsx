"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { SiDiscord, SiGoogle } from "@icons-pack/react-simple-icons";
import { useToast } from "@/hooks/use-toast";

export function LoginForm() {
  const { toast } = useToast();

  const supabase = createClient();

  async function signInWithDiscord() {
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo,
      },
    });
    console.log(data, "heyhey");

    if (error) {
      console.error("Auth error:", error);
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function signInWithGoogle() {
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.error("Auth error:", error);
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }


  return (
    <Card className="w-[350px] bg-gradient-to-br from-purple-950 to-purple-900 text-white border-none">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription className="text-white/70">
          Sign in with your preferred social account
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Button
            className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white"
            onClick={signInWithDiscord}
          >
            <SiDiscord className="mr-2 h-4 w-4" />
            Sign in with Discord
          </Button>
          
          <Button
            className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
            onClick={signInWithGoogle}
          >
            <SiGoogle className="mr-2 h-4 w-4" />
            Sign in with Google
          </Button>
        </div>

        {/* Email/password login temporarily disabled */}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-white/70 text-center w-full">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </CardFooter>
    </Card>
  );
}
