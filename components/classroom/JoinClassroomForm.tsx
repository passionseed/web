"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, AlertCircle, Loader2 } from "lucide-react";

export function JoinClassroomForm() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log("🔍 Attempting to join classroom with code:", joinCode);

      const response = await fetch("/api/classrooms/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          join_code: joinCode.toUpperCase().trim(),
        }),
      });

      console.log("Response status:", response.status);
      console.log(
        "Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      let data;
      try {
        const text = await response.text();
        console.log("Raw response text:", text);
        data = JSON.parse(text);
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError);
        throw new Error(
          `Server returned invalid response (${response.status})`
        );
      }

      if (!response.ok) {
        console.error("API error:", data);
        throw new Error(
          data.error ||
            `Server error: ${response.status} ${response.statusText}`
        );
      }

      console.log("✅ Successfully joined classroom:", data);

      // Redirect to the classroom page
      router.push(`/classrooms/${data.classroom.id}`);
    } catch (error) {
      console.error("Error joining classroom:", error);
      setError(
        error instanceof Error ? error.message : "Failed to join classroom"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().slice(0, 6);
    setJoinCode(value);
    if (error) setError("");
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Join Classroom</span>
        </CardTitle>
        <CardDescription>
          Enter the join code shared by your instructor
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="joinCode">Join Code</Label>
            <Input
              id="joinCode"
              type="text"
              placeholder="ABC123"
              value={joinCode}
              onChange={handleJoinCodeChange}
              className="text-center text-lg font-mono font-bold tracking-widest uppercase"
              maxLength={6}
              required
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground text-center">
              Enter the 6-character code (letters and numbers)
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || joinCode.length !== 6}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Classroom"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Don't have a join code? Contact your instructor to get one.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={async () => {
              try {
                const response = await fetch("/api/debug/classrooms");
                const data = await response.json();
                console.log("Debug classrooms:", data);
                alert(
                  `Found ${data.classrooms?.length || 0} classrooms. Check console for details.`
                );
              } catch (e) {
                console.error("Debug failed:", e);
                alert("Debug failed - check console");
              }
            }}
          >
            Debug: Show All Classrooms
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
