"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";

interface CountdownState {
    remaining_seconds: number;
    is_running: boolean;
    last_daily_increment_date: string;
}

export default function Angpao9393Page() {
    const [countdown, setCountdown] = useState<CountdownState | null>(null);
    const [localSeconds, setLocalSeconds] = useState<number>(0);
    const supabase = createClient();

    // Format seconds to HH:MM:SS (supports negative)
    const formatTime = (totalSeconds: number): string => {
        const isNegative = totalSeconds < 0;
        const absSeconds = Math.abs(totalSeconds);

        const hours = Math.floor(absSeconds / 3600);
        const minutes = Math.floor((absSeconds % 3600) / 60);
        const seconds = absSeconds % 60;

        const formatted = [
            hours.toString().padStart(2, "0"),
            minutes.toString().padStart(2, "0"),
            seconds.toString().padStart(2, "0"),
        ].join(":");

        return isNegative ? `-${formatted}` : formatted;
    };

    // Get current date in GMT+7
    const getCurrentDateGMT7 = (): string => {
        const now = new Date();
        // Convert to GMT+7
        const gmt7Offset = 7 * 60; // 7 hours in minutes
        const localOffset = now.getTimezoneOffset(); // Local offset in minutes
        const gmt7Time = new Date(now.getTime() + (gmt7Offset + localOffset) * 60 * 1000);

        return gmt7Time.toISOString().split('T')[0]; // Returns YYYY-MM-DD
    };

    // Check and apply daily increment if needed
    const checkDailyIncrement = async (currentState: CountdownState) => {
        const todayGMT7 = getCurrentDateGMT7();

        if (currentState.last_daily_increment_date !== todayGMT7) {
            // Add 1 hour (3600 seconds)
            const newSeconds = currentState.remaining_seconds + 3600;

            const { error } = await supabase
                .from("angpao_countdown")
                .update({
                    remaining_seconds: newSeconds,
                    last_daily_increment_date: todayGMT7,
                })
                .eq("id", 1);

            if (!error) {
                console.log("Daily increment applied: +1 hour");
            }
        }
    };

    // Load initial state and subscribe to changes
    useEffect(() => {
        // Fetch initial state
        const fetchInitialState = async () => {
            const { data, error } = await supabase
                .from("angpao_countdown")
                .select("*")
                .eq("id", 1)
                .single();

            if (data && !error) {
                setCountdown(data);
                setLocalSeconds(data.remaining_seconds);

                // Check if we need to apply daily increment
                await checkDailyIncrement(data);
            }
        };

        fetchInitialState();

        // Subscribe to real-time changes
        const channel = supabase
            .channel("angpao_countdown_changes")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "angpao_countdown",
                },
                (payload) => {
                    const newState = payload.new as CountdownState;
                    setCountdown(newState);
                    setLocalSeconds(newState.remaining_seconds);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Handle countdown timer when running
    useEffect(() => {
        if (!countdown?.is_running) return;

        const interval = setInterval(() => {
            setLocalSeconds((prev) => {
                const newValue = prev - 1;

                // Sync to database every 5 seconds to avoid too many updates
                if (Math.abs(newValue - (countdown?.remaining_seconds || 0)) >= 5) {
                    supabase
                        .from("angpao_countdown")
                        .update({ remaining_seconds: newValue })
                        .eq("id", 1);
                }

                return newValue;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [countdown?.is_running]);

    // Check daily increment every minute when page is active
    useEffect(() => {
        if (!countdown) return;

        const checkInterval = setInterval(() => {
            checkDailyIncrement(countdown);
        }, 60000); // Check every minute

        return () => clearInterval(checkInterval);
    }, [countdown]);

    // Toggle countdown running state
    const toggleCountdown = async () => {
        if (!countdown) return;

        const newRunningState = !countdown.is_running;

        const { error } = await supabase
            .from("angpao_countdown")
            .update({
                is_running: newRunningState,
                remaining_seconds: localSeconds, // Sync current value
            })
            .eq("id", 1);

        if (!error) {
            setCountdown({ ...countdown, is_running: newRunningState });
        }
    };

    if (!countdown) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
                <div className="text-white text-2xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
            <div className="text-center space-y-8">
                {/* Countdown Display */}
                <div className="relative">
                    <div
                        className={`text-9xl font-bold font-mono tracking-wider ${localSeconds < 0
                                ? "text-red-500"
                                : "text-white"
                            }`}
                        style={{
                            textShadow: localSeconds < 0
                                ? "0 0 40px rgba(239, 68, 68, 0.5)"
                                : "0 0 40px rgba(255, 255, 255, 0.3)"
                        }}
                    >
                        {formatTime(localSeconds)}
                    </div>

                    {/* Glow effect */}
                    <div className="absolute inset-0 blur-3xl opacity-20 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 -z-10" />
                </div>

                {/* Control Button */}
                <Button
                    onClick={toggleCountdown}
                    size="lg"
                    className={`text-xl px-12 py-6 transition-all duration-300 ${countdown.is_running
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                >
                    {countdown.is_running ? "Pause Countdown" : "Start Countdown"}
                </Button>

                {/* Info text */}
                <p className="text-gray-400 text-sm mt-4">
                    +1 hour added automatically every day at midnight GMT+7
                </p>
            </div>
        </div>
    );
}
