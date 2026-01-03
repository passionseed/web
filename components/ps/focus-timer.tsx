"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Square, CheckCircle, Timer } from "lucide-react";
import { createFocusSession } from "@/actions/ps";
import { useToast } from "@/components/ui/use-toast";

interface FocusTimerProps {
  taskId: string;
  taskTitle: string;
  onSessionSaved?: () => void;
  initialDuration?: number;
}

export function FocusTimer({
  taskId,
  taskTitle,
  onSessionSaved,
  initialDuration = 25,
}: FocusTimerProps) {
  const [mode, setMode] = useState<"setup" | "running" | "paused" | "finished">(
    "setup"
  );
  const [duration, setDuration] = useState(initialDuration); // minutes
  const [timeLeft, setTimeLeft] = useState(initialDuration * 60); // seconds
  const [notes, setNotes] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio("/sounds/alarm.mp3"); // Ensure this exists or use a robust fallback/online url
    // Alternatively, just visual alert if no sound file
  }, []);

  useEffect(() => {
    if (mode === "running") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode]);

  const handleTimerComplete = () => {
    setMode("finished");
    if (timerRef.current) clearInterval(timerRef.current);
    // Play sound
    // try { audioRef.current?.play(); } catch (e) { console.error("Audio play failed", e); }
    // Since we don't have the file guaranteed, let's rely on toast
    toast({
      title: "Focus Time Complete!",
      description: "Great job! Take a break and review what you accomplished.",
      duration: 10000,
    });
    // System notification could optionally be added here
  };

  const startTimer = () => {
    setTimeLeft(duration * 60);
    setMode("running");
  };

  const resumeTimer = () => {
    setMode("running");
  };

  const pauseTimer = () => {
    setMode("paused");
  };

  const stopTimer = () => {
    setMode("setup");
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(duration * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSaveSession = async () => {
    try {
      await createFocusSession(taskId, duration, notes);
      toast({
        title: "Session Saved",
        description: "Your focus session has been recorded.",
      });
      if (onSessionSaved) onSessionSaved();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save session.",
        variant: "destructive",
      });
    }
  };

  if (mode === "setup") {
    return (
      <div className="space-y-6 py-4">
        <div className="space-y-2 text-center">
          <Timer className="w-12 h-12 mx-auto text-primary" />
          <h3 className="text-lg font-medium">Start Focus Session</h3>
          <p className="text-sm text-muted-foreground">Task: {taskTitle}</p>
        </div>

        <div className="space-y-4">
          <Label>Duration (minutes): {duration}</Label>
          <div className="flex gap-2 justify-center">
            {[15, 25, 30, 45, 60, 90].map((m) => (
              <Button
                key={m}
                variant={duration === m ? "default" : "outline"}
                size="sm"
                onClick={() => setDuration(m)}
              >
                {m}m
              </Button>
            ))}
          </div>
          <div className="px-2">
            <Slider
              value={[duration]}
              min={5}
              max={180}
              step={5}
              onValueChange={(val) => setDuration(val[0])}
            />
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={startTimer}>
          <Play className="mr-2 h-4 w-4" /> Start Focus
        </Button>
      </div>
    );
  }

  if (mode === "finished") {
    return (
      <div className="space-y-4 py-4">
        <div className="text-center space-y-2">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
          <h3 className="text-xl font-bold">Session Complete!</h3>
          <p className="text-muted-foreground">{duration} minutes of focus.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Session Notes / Achievements</Label>
          <Textarea
            id="notes"
            placeholder="What did you accomplish?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <Button className="w-full" onClick={handleSaveSession}>
          Save & Close
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-8">
      <div className="text-6xl font-mono font-bold tracking-tighter tabular-nums">
        {formatTime(timeLeft)}
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-1">Focusing on:</p>
        <p className="font-medium">{taskTitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {mode === "running" ? (
          <Button
            size="icon"
            variant="outline"
            className="h-12 w-12 rounded-full"
            onClick={pauseTimer}
          >
            <Pause className="h-6 w-6" />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="default"
            className="h-12 w-12 rounded-full"
            onClick={resumeTimer}
          >
            <Play className="h-6 w-6" />
          </Button>
        )}

        <Button
          size="icon"
          variant="destructive"
          className="h-12 w-12 rounded-full"
          onClick={stopTimer}
        >
          <Square className="h-6 w-6 fill-current" />
        </Button>
      </div>
    </div>
  );
}
