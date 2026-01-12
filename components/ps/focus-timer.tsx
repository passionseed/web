"use client";

import { useState, useEffect, useRef } from "react";
import { PSTask, createFocusSession, updateTaskStatus } from "@/actions/ps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Square, CheckCircle, Timer, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface FocusTimerProps {
  tasks: PSTask[];
  onSessionSaved?: () => void;
  initialDuration?: number;
}

export function FocusTimer({
  tasks,
  onSessionSaved,
  initialDuration = 25,
}: FocusTimerProps) {
  const [mode, setMode] = useState<"setup" | "running" | "paused" | "timesup" | "finished">("setup");
  const [duration, setDuration] = useState(initialDuration); // minutes
  const [timeLeft, setTimeLeft] = useState(initialDuration * 60); // seconds

  // Robust timing states
  const [targetTime, setTargetTime] = useState<number | null>(null);
  const [pausedTimeRemaining, setPausedTimeRemaining] = useState<number | null>(null);
  const [overtimeStartTime, setOvertimeStartTime] = useState<number | null>(null);

  const [overtime, setOvertime] = useState(0); // seconds
  const [baseTimeSaved, setBaseTimeSaved] = useState(false);
  const [notes, setNotes] = useState("");
  const [completedInSession, setCompletedInSession] = useState<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio("/sounds/alarm.mp3");
  }, []);

  // Main Timer Effect (Running)
  useEffect(() => {
    if (mode === "running" && targetTime) {
      // Immediate update to prevent jump
      const updateTimer = () => {
        const now = Date.now();
        const diff = Math.ceil((targetTime - now) / 1000);

        if (diff <= 0) {
          setTimeLeft(0);
          handleTimesUp();
        } else {
          setTimeLeft(diff);
        }
      };

      updateTimer(); // Initial call
      timerRef.current = setInterval(updateTimer, 500); // 500ms for smoother UI updates logic (though displayed per sec)
    } else if (mode === "timesup" && overtimeStartTime) {
      // Overtime logic
      const updateOvertime = () => {
        const now = Date.now();
        setOvertime(Math.floor((now - overtimeStartTime) / 1000));
      };

      updateOvertime();
      timerRef.current = setInterval(updateOvertime, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, targetTime, overtimeStartTime]); // Dependencies for effect

  // Don't need separate useEffect for timeLeft === 0 as it's handled in the tick

  const handleTimesUp = async () => {
    // Only trigger if not already there to avoid race conditions
    // (This is called active mode switch)
    setMode("timesup");
    setTargetTime(null);
    setOvertimeStartTime(Date.now()); // Start counting overtime from NOW

    // Auto-save base time
    try {
      await Promise.all(tasks.map(task => createFocusSession(task.id, duration, "")));
      setBaseTimeSaved(true);
      toast({ title: "Time's Up!", description: "Session time recorded. You can now take a break or add overtime." });
    } catch (e) {
      console.error("Failed to auto-save base time", e);
    }

    // Play sound with robust error handling
    try {
      if (audioRef.current) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Audio playback failed:", error);
          });
        }
      }
    } catch (e) {
      console.log("Audio playback error:", e);
    }
  };

  const handleTimerComplete = () => {
    setMode("finished");
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Direct save without summary screen
  const handleTakeBreak = () => {
    handleSaveSession();
  };

  const startTimer = () => {
    const totalSeconds = duration * 60;
    const target = Date.now() + totalSeconds * 1000;
    setTargetTime(target);
    setTimeLeft(totalSeconds);
    setMode("running");
  };

  const resumeTimer = () => {
    if (pausedTimeRemaining) {
      const target = Date.now() + pausedTimeRemaining * 1000;
      setTargetTime(target);
      setMode("running");
      setPausedTimeRemaining(null);
    }
  };

  const pauseTimer = () => {
    if (targetTime) {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((targetTime - now) / 1000));
      setPausedTimeRemaining(remaining);
      setTimeLeft(remaining); // Visual update
      setTargetTime(null); // Clear target so effect doesn't run
      setMode("paused");
    }
  };

  const stopTimer = () => {
    setMode("setup");
    setTargetTime(null);
    setPausedTimeRemaining(null);
    setOvertimeStartTime(null);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(duration * 60);
    setOvertime(0);
  };

  const addFocusTime = (minutes: number) => {
    const addedMillis = minutes * 60 * 1000;

    // Update duration stats
    setDuration(prev => prev + minutes);

    if (mode === "running" && targetTime) {
      setTargetTime(targetTime + addedMillis);
      // timeLeft updates automatically via effect
    } else if (mode === "paused" && pausedTimeRemaining) {
      setPausedTimeRemaining(pausedTimeRemaining + minutes * 60);
      setTimeLeft(pausedTimeRemaining + minutes * 60);
    } else if (mode === "timesup") {
      // If adding time during overtime, effectively "snoozing" or extending.
      // Usually "Add 5 min" means "Extend session", so we go back to running?
      // The UI button says "Add 5 min", currently logic was just + duration.
      // The user requested logic?
      // Previous logic: setDuration(+), setTimeLeft(min*60), setMode(running).
      // This implies resetting the countdown. 

      // Let's adopt that: Resets to running for X minutes.
      const newTarget = Date.now() + addedMillis;
      setTargetTime(newTarget);
      setOvertime(0);
      setOvertimeStartTime(null);
      setMode("running");
    }
  };

  const toggleTaskCompletion = (taskId: string) => {
    setCompletedInSession(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const actualMinutes = Math.max(1, Math.round((duration * 60 - timeLeft + overtime) / 60));

  const handleSaveSession = async () => {
    try {
      // Determine which tasks to mark as done
      // Logic: Only mark tasks explicitly selected by user.
      const tasksToMarkDone = tasks.filter(t => completedInSession.has(t.id));

      const overtimeMinutes = Math.round(overtime / 60);
      const minutesToSave = baseTimeSaved ? Math.max(0, overtimeMinutes) : actualMinutes;

      // Save session for all tasks (focus time applies to all focused tasks regardless of completion)
      // If base time was saved, only save overtime (if any)
      // If base time wasn't saved (e.g. error or stopped early?), save full actualMinutes

      const promises: Promise<any>[] = [];

      if (minutesToSave > 0) {
        promises.push(...tasks.map(task => createFocusSession(task.id, minutesToSave, notes)));
      }

      promises.push(...tasksToMarkDone.map(task => updateTaskStatus(task.id, "done", task.project_id)));

      await Promise.all(promises);

      toast({
        title: "Session Saved",
        description: `Finalized. ${tasksToMarkDone.length} tasks marked done.`,
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

          <div className="text-sm text-muted-foreground w-full">
            Focusing on:
            <div className="bg-muted/50 p-2 rounded-md mt-2 max-h-48 overflow-y-auto text-left space-y-1">
              {tasks.map((t) => {
                return (
                  <div
                    key={t.id}
                    className="font-medium truncate text-sm p-2 rounded flex items-center gap-2 transition-all hover:bg-muted/80"
                  >
                    <div className="w-4 h-4 rounded-full border border-muted-foreground flex items-center justify-center shrink-0" />
                    {t.goal}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Label>Duration (minutes): {duration}</Label>
          <div className="flex gap-2 justify-center">
            {[1, 5, 10, 15, 25, 30, 45, 60].map((m) => (
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
              min={1}
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

  if (mode === "timesup") {
    return (
      <div className="space-y-8 py-8 text-center">
        <div className="space-y-2">
          <Timer className="w-16 h-16 mx-auto text-orange-500 animate-pulse" />
          <h3 className="text-2xl font-bold">Focus time's up!</h3>
          <h3 className="text-2xl font-bold">Focus time's up!</h3>
          <p className="text-muted-foreground">Great work staying focused.</p>
          <div className="text-xl font-mono text-orange-600 font-bold">
            Overtime: +{formatTime(overtime)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" size="lg" onClick={() => addFocusTime(5)}>
            <Play className="mr-2 h-4 w-4" /> Add 5 min
          </Button>
          <Button size="lg" onClick={handleTakeBreak}>
            Take a Break
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "finished") {
    return (
      <div className="space-y-4 py-4">
        <div className="text-center space-y-2">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
          <h3 className="text-xl font-bold">Session Complete!</h3>
          <h3 className="text-xl font-bold">Session Complete!</h3>
          <p className="text-muted-foreground">{actualMinutes} minutes focused ({duration}m planned{overtime > 0 ? ` + ${Math.round(overtime / 60)}m overtime` : ''}).</p>
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

      <div className="text-center w-full max-w-sm px-4">
        <p className="text-sm text-muted-foreground mb-2">Focusing on {tasks.length} tasks (tap to complete):</p>
        <div className="bg-muted/30 p-4 rounded-lg space-y-2 max-h-48 overflow-y-auto">
          {tasks.map((t) => {
            const isMarkedDone = completedInSession.has(t.id);
            return (
              <div
                key={t.id}
                className={`
                        font-medium truncate text-sm p-2 rounded cursor-pointer transition-all flex items-center gap-2
                        ${isMarkedDone ? 'bg-green-500/10 text-muted-foreground line-through decoration-green-500 decoration-2' : 'hover:bg-muted/50'}
                    `}
                onClick={() => toggleTaskCompletion(t.id)}
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isMarkedDone ? 'bg-green-500 border-green-500' : 'border-muted-foreground'}`}>
                  {isMarkedDone && <Check className="w-3 h-3 text-white" />}
                </div>
                {t.goal}
              </div>
            );
          })}
        </div>
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
          className="h-12 w-12 rounded-full bg-green-500 hover:bg-green-600 text-white"
          onClick={handleTimerComplete}
        >
          <Check className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
