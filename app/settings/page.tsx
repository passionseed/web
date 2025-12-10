"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import {
  User,
  Bell,
  Shield,
  Palette,
  ChevronRight,
  Globe,
  Moon,
  Sun,
  Laptop,
} from "lucide-react";
import { LanguagePicker } from "@/components/language-picker";
import { useTheme } from "next-themes";
import { Label } from "@/components/ui/label";

import { createClient } from "@/utils/supabase/client";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    await supabase.auth.updateUser({
      data: { theme: newTheme },
    });
  };

  const settingsSections = [
    {
      title: "Profile",
      description: "Manage your public profile and personal details",
      icon: User,
      href: "/profile",
      color: "text-blue-500",
    },
    // Account and Notifications are placeholders for now
  ];

  return (
    <div className="container max-w-4xl py-10 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center space-x-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={user?.user_metadata?.avatar_url} />
          <AvatarFallback>
            {user?.email?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your experience.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Language */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Language
                </Label>
                <p className="text-sm text-muted-foreground">
                  Select your preferred language.
                </p>
              </div>
              <LanguagePicker />
            </div>

            {/* Theme */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Palette className="w-4 h-4" /> Appearance
                </Label>
                <p className="text-sm text-muted-foreground">
                  Switch between light and dark mode.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                <Button
                  variant={mounted && theme === "light" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleThemeChange("light")}
                  className="w-8 h-8 p-0"
                >
                  <Sun className="h-4 w-4" />
                </Button>
                <Button
                  variant={mounted && theme === "dark" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleThemeChange("dark")}
                  className="w-8 h-8 p-0"
                >
                  <Moon className="h-4 w-4" />
                </Button>
                <Button
                  variant={mounted && theme === "system" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleThemeChange("system")}
                  className="w-8 h-8 p-0"
                >
                  <Laptop className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {settingsSections.map((section) => (
            <Link key={section.title} href={section.href}>
              <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer border-2 hover:border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-medium">
                    <div className="flex items-center gap-2">
                      <section.icon className={`h-5 w-5 ${section.color}`} />
                      {section.title}
                    </div>
                  </CardTitle>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {section.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Placeholder for Account */}
          <Card className="h-full opacity-60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-medium">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  Account
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Security and data settings (Coming Soon)
              </CardDescription>
            </CardContent>
          </Card>

          {/* Placeholder for Notifications */}
          <Card className="h-full opacity-60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-medium">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-500" />
                  Notifications
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Manage your alerts (Coming Soon)
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
