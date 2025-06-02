"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, UserIcon, AtSignIcon, MailIcon } from "lucide-react";

export default function FinishProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  // State for username validation
  const [usernameError, setUsernameError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        console.error("Error fetching user or no user logged in:", error);
        // Redirect to login if no user is found, or handle appropriately
        router.push("/login");
        return;
      }
      setUser(data.user);
      // Fetch existing profile data to pre-fill the form
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileData) {
        setFullName(profileData.full_name || "");
        setUsername(profileData.username || "");
        setDateOfBirth(profileData.date_of_birth || "");
      }
      setLoading(false);
    };
    fetchUser();
  }, [supabase, router]);

  // Check if username is unique
  const checkUsernameUnique = async (username: string) => {
    if (!username) return;

    setIsCheckingUsername(true);
    setUsernameError("");

    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", user?.id || "") // Exclude current user
      .maybeSingle();

    setIsCheckingUsername(false);

    if (error) {
      console.error("Error checking username:", error);
      setUsernameError("Error checking username availability");
      return false;
    }

    if (data) {
      setUsernameError("Username already taken");
      return false;
    }

    return true;
  };

  const handleProfileUpdate = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setLoading(true);
    if (!user) {
      console.error("User not available for profile update");
      setLoading(false);
      return;
    }

    // Check if username is unique before proceeding
    const isUsernameUnique = await checkUsernameUnique(username);
    if (!isUsernameUnique) {
      setLoading(false);
      return;
    }

    const updates = {
      id: user.id,
      full_name: fullName,
      username: username,
      date_of_birth: dateOfBirth,
      updated_at: new Date(),
      avatar_url: user.user_metadata?.avatar_url || null,
      email: user.email,
    };

    const { error } = await supabase.from("profiles").upsert(updates);

    if (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile: " + error.message);
    } else {
      // Redirect to interests page after profile is updated
      router.push(
        `/auth/interests?next=${encodeURIComponent(searchParams.get("next") || "/me")}`
      );
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
            <p className="text-center text-muted-foreground">
              Loading your profile...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    // This case should ideally be handled by the redirect in useEffect
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Redirecting to login...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-10">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Complete Your Profile
          </CardTitle>
          <CardDescription className="text-center">
            Let's set up your profile before you continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <MailIcon className="h-4 w-4" /> Email
                </Label>
                <div className="relative">
                  <Input
                    type="email"
                    id="email"
                    value={user.email || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" /> Full Name
                </Label>
                <Input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2">
                  <AtSignIcon className="h-4 w-4" /> Username (unique)
                </Label>
                <Input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (e.target.value) checkUsernameUnique(e.target.value);
                  }}
                  required
                  placeholder="Choose a unique username"
                  className={usernameError ? "border-red-500" : ""}
                />
                {usernameError && (
                  <p className="text-sm text-red-500 mt-1">{usernameError}</p>
                )}
                {isCheckingUsername && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Checking username availability...
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="dateOfBirth"
                  className="flex items-center gap-2"
                >
                  <CalendarIcon className="h-4 w-4" /> Date of Birth
                </Label>
                <Input
                  type="date"
                  id="dateOfBirth"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Save Profile & Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
