"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, X, ArrowLeft, Phone, Calendar as CalendarIcon, Clock, GraduationCap, UserCheck, RotateCcw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";

interface SeedSettingsProps {
    room: any;
    seed: any;
    currentUser: any;
    isAdmin?: boolean;
    isInstructor?: boolean;
}

export function SeedSettings({ room, seed, currentUser, isAdmin = false, isInstructor = false }: SeedSettingsProps) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isMentorOpen, setIsMentorOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedTime, setSelectedTime] = useState("");
    const [currentRoom, setCurrentRoom] = useState(room);
    const [mentorLoading, setMentorLoading] = useState(false);
    const [scheduledSessions, setScheduledSessions] = useState<any[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [userHasPendingSession, setUserHasPendingSession] = useState(false);
    const [sessionToCancel, setSessionToCancel] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [bookedTimes, setBookedTimes] = useState<string[]>([]);
    const [mentorAvailability, setMentorAvailability] = useState<any[]>([]);
    const supabase = createClient();

    // Load scheduled sessions and mentor availability
    useEffect(() => {
        if (isMentorOpen) {
            loadScheduledSessions();
            loadMentorAvailability();
        }
    }, [isMentorOpen]);

    // Update booked times when date changes
    useEffect(() => {
        if (selectedDate && currentRoom.mentor_id) {
            loadBookedTimesForDate(selectedDate);
        } else {
            setBookedTimes([]);
        }
    }, [selectedDate]);

    const loadMentorAvailability = async () => {
        if (!currentRoom.mentor_id) return;

        try {
            const { data, error } = await supabase
                .from("mentor_availability")
                .select("*")
                .eq("mentor_id", currentRoom.mentor_id);

            if (error) throw error;
            setMentorAvailability(data || []);
        } catch (error) {
            console.error("Error loading mentor availability:", error);
        }
    };

    const loadBookedTimesForDate = async (date: Date) => {
        if (!currentRoom.mentor_id) return;

        try {
            const formattedDate = date.toISOString().split('T')[0];
            const { data, error } = await supabase
                .from("mentor_sessions")
                .select("scheduled_time")
                .eq("mentor_id", currentRoom.mentor_id)
                .eq("scheduled_date", formattedDate)
                .eq("status", "pending");

            if (error) throw error;

            setBookedTimes(data?.map((s: any) => s.scheduled_time) || []);
        } catch (error) {
            console.error("Error loading booked times:", error);
        }
    };

    const loadScheduledSessions = async () => {
        setSessionsLoading(true);
        try {
            const { data, error } = await supabase
                .from("mentor_sessions")
                .select(`
                    *,
                    student:profiles!mentor_sessions_student_id_fkey(full_name, username)
                `)
                .eq("room_id", currentRoom.id)
                .eq("status", "pending")
                .order("scheduled_date", { ascending: true })
                .order("scheduled_time", { ascending: true });

            if (error) throw error;

            setScheduledSessions(data || []);

            // Check if current user has a pending session
            const userSession = data?.find(session => session.student_id === currentUser.id);
            setUserHasPendingSession(!!userSession);
        } catch (error) {
            console.error("Error loading sessions:", error);
        } finally {
            setSessionsLoading(false);
        }
    };

    // Get available time slots for the selected date
    const getAvailableTimeSlots = () => {
        if (!selectedDate || !currentRoom.mentor_id) {
            return []; // No slots if no date selected or no mentor
        }

        const dayOfWeek = selectedDate.getDay(); // 0=Sunday, 6=Saturday

        // Find mentor's availability for this day
        const dayAvailability = mentorAvailability.find(a => a.day_of_week === dayOfWeek);

        if (!dayAvailability) {
            return []; // Mentor not available on this day
        }

        // Strip seconds from database times (HH:MM:SS -> HH:MM)
        const startTime = dayAvailability.start_time.substring(0, 5);
        const endTime = dayAvailability.end_time.substring(0, 5);

        console.log("Day of week:", dayOfWeek);
        console.log("Availability:", { startTime, endTime });

        // Generate all 30-minute slots
        const allSlots = Array.from({ length: 48 }, (_, i) => {
            const hours = Math.floor(i / 2);
            const minutes = i % 2 === 0 ? '00' : '30';
            return `${hours.toString().padStart(2, '0')}:${minutes}`;
        });

        // Filter slots within mentor's availability
        const availableSlots = allSlots.filter(time => {
            return time >= startTime && time <= endTime;
        });

        console.log("Available slots:", availableSlots);
        console.log("Booked times:", bookedTimes);

        // Filter out already booked times
        const unbookedSlots = availableSlots.filter(time => !bookedTimes.includes(time));

        console.log("Unbooked slots:", unbookedSlots);

        return unbookedSlots;
    };

    // Admin and instructor can navigate back to seeds menu
    const canAccessSeedsMenu = isAdmin || isInstructor;
    const canManageMentor = isAdmin || isInstructor;

    // Mentor status
    const isMentor = currentRoom.mentor_id === currentUser.id;
    const hasMentor = !!currentRoom.mentor_id;

    const handleAssignMentor = async () => {
        setMentorLoading(true);
        try {
            // Check if room already has a mentor
            const { data: roomData, error: checkError } = await supabase
                .from("seed_rooms")
                .select("mentor_id")
                .eq("id", room.id)
                .single();

            if (checkError) throw checkError;

            if (roomData.mentor_id) {
                toast.error("This room already has a mentor assigned");
                setMentorLoading(false);
                return;
            }

            const { error } = await supabase
                .from("seed_rooms")
                .update({ mentor_id: currentUser.id })
                .eq("id", room.id)
                .eq("mentor_id", null); // Only update if mentor_id is still null

            if (error) throw error;

            setCurrentRoom({ ...currentRoom, mentor_id: currentUser.id });
            toast.success("You are now the mentor for this room!");
        } catch (error: any) {
            console.error("Error assigning mentor:", error);
            toast.error(error.message || "Failed to assign as mentor");
        } finally {
            setMentorLoading(false);
        }
    };

    const handleUnassignMentor = async () => {
        setMentorLoading(true);
        try {
            const { error } = await supabase
                .from("seed_rooms")
                .update({ mentor_id: null })
                .eq("id", room.id);

            if (error) throw error;

            setCurrentRoom({ ...currentRoom, mentor_id: null });
            toast.success("Mentor unassigned");
        } catch (error: any) {
            console.error("Error unassigning mentor:", error);
            toast.error(error.message || "Failed to unassign mentor");
        } finally {
            setMentorLoading(false);
        }
    };

    const handleCancelClick = (sessionId: string) => {
        console.log("🔵 Cancel button clicked! Session ID:", sessionId);
        setSessionToCancel(sessionId);
    };

    const handleConfirmCancel = async () => {
        if (!sessionToCancel) return;

        console.log("=== CANCEL SESSION DEBUG START ===");
        console.log("Session ID to cancel:", sessionToCancel);
        console.log("API URL:", `/api/mentor-sessions/${sessionToCancel}/cancel`);

        setIsCancelling(true);

        try {
            const response = await fetch(`/api/mentor-sessions/${sessionToCancel}/cancel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            console.log("Response status:", response.status);
            console.log("Response ok:", response.ok);

            const data = await response.json();
            console.log("Response data:", data);

            if (!response.ok) {
                throw new Error(data.error || "Failed to cancel session");
            }

            if (data.discordNotificationSent) {
                toast.success("Session cancelled! Mentor has been notified on Discord.");
            } else {
                toast.success("Session cancelled successfully!");
            }

            setUserHasPendingSession(false);
            setSessionToCancel(null);
            await loadScheduledSessions();
            console.log("=== CANCEL SESSION DEBUG END ===");
        } catch (error: any) {
            console.error("❌ Error canceling session:", error);
            console.error("Error details:", error);
            toast.error(error.message || "Failed to cancel session");
            console.log("=== CANCEL SESSION DEBUG END (ERROR) ===");
        } finally {
            setIsCancelling(false);
        }
    };

    const handleScheduleMentor = async () => {
        console.log("=== SCHEDULE MENTOR DEBUG START ===");
        console.log("Selected Date:", selectedDate);
        console.log("Selected Time:", selectedTime);
        console.log("Current Room ID:", currentRoom.id);

        if (userHasPendingSession) {
            console.log("❌ User already has a pending session");
            toast.error("You already have a pending session. Please cancel it first.");
            return;
        }

        if (!selectedDate || !selectedTime) {
            console.log("❌ Missing date or time");
            toast.error("Please select both date and time");
            return;
        }

        console.log("✅ Validation passed, starting request...");
        setMentorLoading(true);
        toast.info("Scheduling mentor session...");

        try {
            // Format date as YYYY-MM-DD
            const formattedDate = selectedDate.toISOString().split('T')[0];

            const requestBody = {
                roomId: currentRoom.id,
                scheduledDate: formattedDate,
                scheduledTime: selectedTime,
            };
            console.log("Request body:", requestBody);

            const response = await fetch("/api/mentor-sessions/schedule", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            console.log("Response status:", response.status);
            console.log("Response ok:", response.ok);

            const data = await response.json();
            console.log("Response data:", data);

            if (!response.ok) {
                console.error("❌ API returned error:", data);
                throw new Error(data.error || "Failed to schedule session");
            }

            console.log("✅ Session scheduled successfully");

            if (data.discordNotificationSent) {
                toast.success("Mentor session scheduled! Mentor has been notified on Discord.");
            } else {
                toast.success("Mentor session scheduled!");
            }

            // Reset form and reload sessions
            setSelectedDate(undefined);
            setSelectedTime("");
            setUserHasPendingSession(true);
            await loadScheduledSessions();
        } catch (error: any) {
            console.error("❌ Error scheduling mentor:", error);
            console.error("Error stack:", error.stack);
            toast.error(error.message || "Failed to schedule session");
        } finally {
            setMentorLoading(false);
            console.log("=== SCHEDULE MENTOR DEBUG END ===");
        }
    };

    const handleLeaveClick = () => {
        console.log("🔴 Leave button clicked");
        setShowConfirm(true);
    };

    const handleLeaveConfirm = async () => {
        console.log("=== LEAVE SEED DEBUG START ===");
        console.log("Room ID:", room.id);
        console.log("User ID:", currentUser.id);

        setLoading(true);
        setShowConfirm(false);

        try {
            const { error } = await supabase
                .from("seed_room_members")
                .delete()
                .eq("room_id", room.id)
                .eq("user_id", currentUser.id)
                .select();

            if (error) {
                console.error("❌ Delete error:", error);
                const errorMessage = error.message || error.hint || "Failed to leave seed";
                throw new Error(errorMessage);
            }

            console.log("✅ Successfully left seed");
            toast.success("Left the seed session");
            window.location.href = "/seeds";

        } catch (error: any) {
            console.error("❌ Error leaving seed:", error);
            toast.error(error.message || "Failed to leave seed");
        } finally {
            setLoading(false);
            console.log("=== LEAVE SEED DEBUG END ===");
        }
    };

    const handleResetClick = () => {
        console.log("🔄 Reset progress button clicked");
        setShowResetConfirm(true);
    };

    const handleResetConfirm = async () => {
        console.log("=== RESET PROGRESS DEBUG START ===");
        console.log("Room ID:", room.id);
        console.log("User ID:", currentUser.id);
        console.log("Seed ID:", seed.id);

        setResetting(true);
        setShowResetConfirm(false);

        try {
            // Call API to reset progress
            const response = await fetch("/api/seeds/reset-progress", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    roomId: room.id,
                    userId: currentUser.id,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to reset progress");
            }

            console.log("✅ Successfully reset progress");
            toast.success("Progress reset successfully!");

            // Redirect to seed info page
            window.location.href = `/seeds/${seed.id}`;

        } catch (error: any) {
            console.error("❌ Error resetting progress:", error);
            toast.error(error.message || "Failed to reset progress");
        } finally {
            setResetting(false);
            console.log("=== RESET PROGRESS DEBUG END ===");
        }
    };

    return (
        <>
            {/* Left: Seed Info Button + Settings Button stacked */}
            <div className="absolute top-4 left-4 z-40 flex flex-col gap-2">
                {/* Seed Info Button */}
                <Link href={`/seeds/${seed.id}`}>
                    <Button
                        variant="outline"
                        className="bg-neutral-900/90 border-neutral-700 hover:bg-neutral-800 gap-2"
                        size="sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="font-medium">Seed Info</span>
                    </Button>
                </Link>

                {/* Settings Button */}
                <Button
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    variant="outline"
                    className="bg-neutral-900/90 border-neutral-700 hover:bg-neutral-800 gap-2"
                    size="sm"
                >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                </Button>

                {/* Call Mentor Button */}
                <Button
                    onClick={() => setIsMentorOpen(true)}
                    variant="outline"
                    className="bg-emerald-900/90 border-emerald-700 hover:bg-emerald-800 gap-2 text-emerald-100"
                    size="sm"
                >
                    <Phone className="w-4 h-4" />
                    <span>Call Mentor</span>
                </Button>
            </div>

            {/* Left: Settings Panel */}
            {isSettingsOpen && (
                <div className="absolute top-28 left-4 z-40 w-72">
                    <Card className="bg-neutral-900/95 backdrop-blur border-neutral-700 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-white">Settings</h3>
                            <Button
                                onClick={() => setIsSettingsOpen(false)}
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {/* Admin/Instructor: Go to Seeds Menu */}
                            {canAccessSeedsMenu && (
                                <Link href="/seeds?admin=true">
                                    <Button
                                        variant="outline"
                                        className="w-full gap-2 bg-neutral-800 border-neutral-600 hover:bg-neutral-700"
                                        size="sm"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Seeds Menu
                                    </Button>
                                </Link>
                            )}

                            <div className={canAccessSeedsMenu ? "pt-3 border-t border-neutral-700" : ""}>
                                {!showConfirm ? (
                                    <Button
                                        onClick={handleLeaveClick}
                                        disabled={loading}
                                        variant="destructive"
                                        className="w-full gap-2"
                                        size="sm"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Leave Seed
                                    </Button>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-xs text-yellow-300 text-center">
                                            Are you sure?
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => setShowConfirm(false)}
                                                variant="outline"
                                                className="flex-1"
                                                size="sm"
                                                disabled={loading}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleLeaveConfirm}
                                                variant="destructive"
                                                className="flex-1"
                                                size="sm"
                                                disabled={loading}
                                            >
                                                {loading ? "..." : "Confirm"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Reset Progress Section */}
                            <div className="pt-3 border-t border-neutral-700">
                                {!showResetConfirm ? (
                                    <Button
                                        onClick={handleResetClick}
                                        disabled={resetting}
                                        variant="outline"
                                        className="w-full gap-2 border-orange-600 text-orange-500 hover:bg-orange-900/20 hover:text-orange-400"
                                        size="sm"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Reset Progress
                                    </Button>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-xs text-yellow-300 text-center">
                                            Reset all progress? You'll keep your badge!
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => setShowResetConfirm(false)}
                                                variant="outline"
                                                className="flex-1"
                                                size="sm"
                                                disabled={resetting}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleResetConfirm}
                                                variant="outline"
                                                className="flex-1 border-orange-600 text-orange-500 hover:bg-orange-900/40"
                                                size="sm"
                                                disabled={resetting}
                                            >
                                                {resetting ? "..." : "Confirm"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Mentor Scheduling Dialog */}
            <Dialog open={isMentorOpen} onOpenChange={setIsMentorOpen}>
                <DialogContent className="bg-neutral-900 border-neutral-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Phone className="w-5 h-5" />
                            Schedule Mentor Session
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 pt-4">
                        {/* Calendar Date Picker */}
                        <div className="space-y-2">
                            <Label className="text-neutral-200 flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4" />
                                Select Date
                            </Label>
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                disabled={(date) => date < new Date() || userHasPendingSession}
                                className="rounded-md border border-neutral-700 bg-neutral-800"
                            />
                        </div>

                        {/* Time Picker - 30 minute intervals only */}
                        <div className="space-y-2">
                            <Label htmlFor="time" className="text-neutral-200 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Select Time
                            </Label>
                            {!selectedDate ? (
                                <p className="text-neutral-400 text-sm">Please select a date first</p>
                            ) : getAvailableTimeSlots().length === 0 ? (
                                <p className="text-yellow-400 text-sm">
                                    No available time slots for this day. Mentor may not have set availability.
                                </p>
                            ) : (
                                <select
                                    id="time"
                                    value={selectedTime}
                                    onChange={(e) => setSelectedTime(e.target.value)}
                                    className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-md px-3 py-2"
                                    disabled={userHasPendingSession}
                                >
                                    <option value="">Choose a time</option>
                                    {getAvailableTimeSlots().map(time => (
                                        <option key={time} value={time}>
                                            {time}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Warning if user has pending session */}
                        {userHasPendingSession && (
                            <div className="bg-yellow-900/20 border border-yellow-700 rounded-md p-3 text-yellow-200 text-sm">
                                You already have a pending session. Please cancel it before scheduling another.
                            </div>
                        )}

                        {/* Schedule Button */}
                        <Button
                            onClick={handleScheduleMentor}
                            disabled={mentorLoading || !selectedDate || !selectedTime || userHasPendingSession}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {mentorLoading ? "Scheduling..." : "Schedule Session"}
                        </Button>

                        {/* Scheduled Sessions List */}
                        <div className="border-t border-neutral-700 pt-4">
                            <h3 className="font-semibold text-white mb-3">Scheduled Sessions</h3>
                            {sessionsLoading ? (
                                <p className="text-neutral-400 text-sm">Loading...</p>
                            ) : scheduledSessions.length === 0 ? (
                                <p className="text-neutral-400 text-sm">No scheduled sessions</p>
                            ) : (
                                <div className="space-y-2">
                                    {scheduledSessions.map((session) => (
                                        <div
                                            key={session.id}
                                            className="bg-neutral-800 rounded-lg p-3 flex items-center justify-between"
                                        >
                                            <div>
                                                <p className="text-white font-medium">
                                                    {new Date(session.scheduled_date).toLocaleDateString('en-US', {
                                                        weekday: 'short',
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                    {' at '}
                                                    {session.scheduled_time.slice(0, 5)}
                                                </p>
                                                {session.student && (
                                                    <p className="text-neutral-400 text-sm">
                                                        Student: {session.student.full_name || session.student.username}
                                                    </p>
                                                )}
                                            </div>
                                            <Button
                                                onClick={() => handleCancelClick(session.id)}
                                                variant="destructive"
                                                size="sm"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Cancel Confirmation */}
                        {sessionToCancel && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 max-w-sm mx-4">
                                    <h3 className="text-white font-semibold text-lg mb-3">
                                        Cancel Session?
                                    </h3>
                                    <p className="text-neutral-300 text-sm mb-6">
                                        Are you sure you want to cancel this mentor session? The mentor will be notified.
                                    </p>
                                    <div className="flex gap-3">
                                        <Button
                                            onClick={() => setSessionToCancel(null)}
                                            variant="outline"
                                            className="flex-1"
                                            disabled={isCancelling}
                                        >
                                            No, Keep It
                                        </Button>
                                        <Button
                                            onClick={handleConfirmCancel}
                                            variant="destructive"
                                            className="flex-1"
                                            disabled={isCancelling}
                                        >
                                            {isCancelling ? "Cancelling..." : "Yes, Cancel"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
