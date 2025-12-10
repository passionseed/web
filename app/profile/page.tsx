"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Upload,
  Save,
  User,
  Mail,
  Calendar,
  Edit2,
  School,
  GraduationCap,
  Building,
  Loader2,
  Camera,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string;
  avatar_url: string | null;
  date_of_birth: string | null;
  discord_id: string | null;
  education_level: "high_school" | "university" | "unaffiliated" | null;
  created_at: string | null;
  updated_at: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const supabase = createClient();

  // Form states
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [discordId, setDiscordId] = useState("");
  const [educationLevel, setEducationLevel] = useState<
    "high_school" | "university" | "unaffiliated"
  >("high_school");

  useEffect(() => {
    fetchProfile();
  }, []);

  const createProfile = async (user: any) => {
    try {
      const { data: newProfile, error } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email,
          full_name:
            user.user_metadata?.full_name || user.user_metadata?.name || null,
          username:
            user.user_metadata?.preferred_username ||
            user.email?.split("@")[0] ||
            `user_${user.id.slice(0, 8)}`,
          avatar_url: user.user_metadata?.avatar_url || null,
          education_level: "high_school",
        })
        .select("*")
        .single();

      if (error) {
        console.error("Error creating profile:", error);
        toast.error("Failed to create profile");
        return;
      }

      setProfile(newProfile);
      setFullName(newProfile.full_name || "");
      setUsername(newProfile.username || "");
      setDateOfBirth(newProfile.date_of_birth || "");
      setDiscordId(newProfile.discord_id || "");
      setEducationLevel(newProfile.education_level || "high_school");
      toast.success("Profile created successfully!");
    } catch (error) {
      console.error("Profile creation error:", error);
      toast.error("Failed to create profile");
    }
  };

  const fetchProfile = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        toast.error("Please log in to view your profile");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        if (profileError.code === "PGRST116") {
          // Profile doesn't exist, create one
          await createProfile(user);
        } else {
          console.error("Error fetching profile:", profileError);
          toast.error("Failed to load profile");
        }
        return;
      }

      setProfile(profileData);
      setFullName(profileData.full_name || "");
      setUsername(profileData.username || "");
      setDateOfBirth(profileData.date_of_birth || "");
      setDiscordId(profileData.discord_id || "");
      setEducationLevel(profileData.education_level || "high_school");
    } catch (error) {
      console.error("Profile fetch error:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      // Update local state with new avatar URL
      setProfile((prev) =>
        prev ? { ...prev, avatar_url: result.fileUrl } : null
      );
      toast.success("Avatar updated successfully!");
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload avatar"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName || null,
          username: username,
          date_of_birth: dateOfBirth || null,
          discord_id: discordId || null,
          education_level: educationLevel,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) {
        throw new Error("Failed to update profile");
      }

      // Update local state
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: fullName || null,
              username,
              date_of_birth: dateOfBirth || null,
              discord_id: discordId || null,
              education_level: educationLevel,
              updated_at: new Date().toISOString(),
            }
          : null
      );

      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Profile save error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setFullName(profile.full_name || "");
      setUsername(profile.username || "");
      setDateOfBirth(profile.date_of_birth || "");
      setDiscordId(profile.discord_id || "");
      setEducationLevel(profile.education_level || "high_school");
    }
    setIsEditing(false);
  };

  const EducationCard = ({
    type,
    level,
    icon: Icon,
    title,
    description,
  }: {
    type: string;
    level: string;
    icon: any;
    title: string;
    description: string;
  }) => (
    <div
      onClick={() => isEditing && setEducationLevel(level as any)}
      className={cn(
        "relative flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-200",
        isEditing
          ? "cursor-pointer hover:border-primary/50 hover:bg-accent/50"
          : "opacity-75",
        educationLevel === level
          ? "border-primary bg-primary/5"
          : "border-transparent bg-muted/50"
      )}
    >
      <div
        className={cn(
          "p-2 rounded-lg mb-3",
          educationLevel === level
            ? "bg-primary text-primary-foreground"
            : "bg-background text-muted-foreground"
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="container max-w-5xl py-10">
        <div className="flex items-center gap-6 mb-8">
          <div className="h-24 w-24 rounded-full bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Profile not found</h2>
          <p className="text-muted-foreground">
            Please try logging out and back in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-10 space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between pb-8 border-b">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
              <AvatarImage
                src={profile.avatar_url || "/placeholder-user.jpg"}
              />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {profile.full_name?.charAt(0) ||
                  profile.username?.charAt(0) ||
                  "U"}
              </AvatarFallback>
            </Avatar>
            <label
              htmlFor="avatar-upload"
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-black/60 text-white rounded-full opacity-0 transition-opacity cursor-pointer",
                (uploading || isEditing) && "group-hover:opacity-100"
              )}
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Camera className="w-6 h-6" />
              )}
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {profile.full_name || profile.username}
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-medium text-foreground">
                @{profile.username}
              </span>
              <span>•</span>
              <span>{profile.email}</span>
            </div>
            {profile.created_at && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                <Calendar className="w-4 h-4" />
                <span>
                  Joined{" "}
                  {new Date(profile.created_at).toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {isEditing ? (
            <>
              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex-1 md:flex-none"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={saving}
                className="flex-1 md:flex-none"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="flex-1 md:flex-none"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Left Column: Personal Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and public profile info.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={!isEditing}
                      className="pl-9"
                      placeholder="Your full name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-muted-foreground text-sm">
                      @
                    </span>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={!isEditing}
                      className="pl-8"
                      placeholder="username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discordId">Discord ID</Label>
                  <Input
                    id="discordId"
                    value={discordId}
                    onChange={(e) => setDiscordId(e.target.value)}
                    disabled={!isEditing}
                    placeholder="username#0000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>
                Manage your account settings and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Email Address</p>
                    <p className="text-sm text-muted-foreground">
                      {profile.email}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" disabled>
                    Managed by Auth Provider
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Education & Status */}
        <div className="space-y-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Education Level</CardTitle>
              <CardDescription>Where are you in your journey?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EducationCard
                type="radio"
                level="high_school"
                icon={School}
                title="High School"
                description="Currently appearing for high school exams"
              />
              <EducationCard
                type="radio"
                level="university"
                icon={GraduationCap}
                title="University"
                description="Pursuing a bachelors or masters degree"
              />
              <EducationCard
                type="radio"
                level="unaffiliated"
                icon={Building}
                title="Unaffiliated"
                description="Not currently enrolled in an institution"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
