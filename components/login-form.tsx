"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { DiscIcon as Discord, Mail, Lock, UserPlus, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
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

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (authMode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Success!",
          description: "You have been signed in successfully.",
        });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-[350px] bg-gradient-to-br from-purple-950 to-purple-900 text-white border-none">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription className="text-white/70">
          Choose your preferred sign in method
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

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/20" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-transparent px-2 text-white/70">Or continue with</span>
          </div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/80">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-white/50" />
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/80">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                required
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-none"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  {authMode === "sign-in" ? "Signing In..." : "Signing Up..."}
                </>
              ) : (
                <>
                  {authMode === "sign-in" ? (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Sign Up
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="text-center text-sm">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in")}
            className="text-white/70 hover:text-white"
          >
            {authMode === "sign-in"
              ? "Don't have an account? Sign Up"
              : "Already have an account? Sign In"}
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-white/70 text-center w-full">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </CardFooter>
    </Card>
  );
}
