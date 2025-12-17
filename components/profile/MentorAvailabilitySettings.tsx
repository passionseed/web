"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Save } from "lucide-react";
import { toast } from "sonner";

interface AvailabilitySlot {
    id?: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
}

const DAYS = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
];

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2);
    const minutes = i % 2 === 0 ? '00' : '30';
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
});

export function MentorAvailabilitySettings({ userId }: { userId: string }) {
    const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
    const [originalAvailability, setOriginalAvailability] = useState<AvailabilitySlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        fetchAvailability();
    }, [userId]);

    const fetchAvailability = async () => {
        try {
            console.log("Fetching availability for mentor:", userId);
            const { data, error } = await supabase
                .from("mentor_availability")
                .select("*")
                .eq("mentor_id", userId)
                .order("day_of_week", { ascending: true });

            console.log("Fetch result - Data:", data);
            console.log("Fetch result - Error:", error);

            if (data && data.length > 0) {
                console.log("Sample fetched slot:", data[0]);
                console.log("Keys in fetched slot:", Object.keys(data[0]));
            }

            if (error) throw error;

            const availabilityData = data || [];
            setAvailability(availabilityData);
            setOriginalAvailability(JSON.parse(JSON.stringify(availabilityData))); // Deep copy
            console.log("Availability state set to:", data);
        } catch (error) {
            console.error("Error fetching availability:", error);
            toast.error("Failed to load availability");
        } finally {
            setLoading(false);
        }
    };

    const handleTimeChange = (dayOfWeek: number, field: 'start_time' | 'end_time', value: string) => {
        setAvailability(prev => {
            const existing = prev.find(a => a.day_of_week === dayOfWeek);

            if (existing) {
                return prev.map(a => {
                    if (a.day_of_week !== dayOfWeek) return a;

                    const updates: any = { [field]: value };

                    // If changing start time, auto-update end time if needed
                    if (field === 'start_time') {
                        if (value === "") {
                            updates.end_time = "";
                        } else {
                            // Find index of start time
                            const startIndex = TIME_SLOTS.indexOf(value);
                            // Auto set end time to 30 mins later (next slot) or 1 hour later (next next slot)?
                            // Let's do 1 hour later if possible, if not then end of day
                            const nextIndex = startIndex + 2;
                            if (nextIndex < TIME_SLOTS.length) {
                                // Only update end time if it's currently empty or less than new start time
                                if (!a.end_time || a.end_time <= value) {
                                    updates.end_time = TIME_SLOTS[nextIndex] || TIME_SLOTS[TIME_SLOTS.length - 1];
                                }
                            }
                        }
                    }

                    return { ...a, ...updates };
                });
            } else {
                // Determine initial end time based on start time
                let initialEndTime = '17:00';
                if (field === 'start_time' && value) {
                    const startIndex = TIME_SLOTS.indexOf(value);
                    const nextIndex = startIndex + 2;
                    if (nextIndex < TIME_SLOTS.length) {
                        initialEndTime = TIME_SLOTS[nextIndex];
                    }
                }

                return [...prev, {
                    day_of_week: dayOfWeek,
                    start_time: field === 'start_time' ? value : '09:00',
                    end_time: field === 'end_time' ? value : initialEndTime,
                }];
            }
        });
    };

    const handleSaveAvailability = async () => {
        setSaving(true);
        try {
            console.log("Saving availability for mentor:", userId);
            console.log("Current availability state:", availability);

            // Delete all existing availability for this mentor
            const { error: deleteError } = await supabase
                .from("mentor_availability")
                .delete()
                .eq("mentor_id", userId);

            console.log("Delete result - Error:", deleteError);

            // Insert new availability slots (only non-empty ones)
            const validSlots = availability.filter(slot => slot.start_time && slot.end_time);
            console.log("Valid slots to insert:", validSlots);

            if (validSlots.length > 0) {
                const slotsToInsert = validSlots.map(slot => ({
                    mentor_id: userId,
                    day_of_week: slot.day_of_week,
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                }));

                console.log("Inserting slots:", slotsToInsert);

                const { data: insertedData, error: insertError } = await supabase
                    .from("mentor_availability")
                    .insert(slotsToInsert)
                    .select();

                console.log("Insert result - Data:", insertedData);
                console.log("Insert result - Error:", insertError);

                if (insertError) throw insertError;
            }

            toast.success("Availability updated successfully!");
            await fetchAvailability();
        } catch (error: any) {
            console.error("Error saving availability:", error);
            toast.error(error.message || "Failed to save availability");
        } finally {
            setSaving(false);
        }
    };

    const getSlotForDay = (dayOfWeek: number) => {
        const slot = availability.find(a => a.day_of_week === dayOfWeek) || {
            day_of_week: dayOfWeek,
            start_time: '',
            end_time: '',
        };

        // Strip seconds from times if they exist (database stores HH:MM:SS, we need HH:MM)
        if (slot.start_time && slot.start_time.includes(':')) {
            const parts = slot.start_time.split(':');
            slot.start_time = `${parts[0]}:${parts[1]}`;
        }
        if (slot.end_time && slot.end_time.includes(':')) {
            const parts = slot.end_time.split(':');
            slot.end_time = `${parts[0]}:${parts[1]}`;
        }

        console.log(`getSlotForDay(${dayOfWeek}):`, slot);
        return slot;
    };

    const applyToAll = (daysToApply: number[]) => {
        // Use Monday (index 1) as the source, or if unavailable, try to find the first populated day
        // Default to 09:00 - 17:00 if nothing is set
        let sourceSlot = availability.find(a => a.start_time && a.end_time);

        // If we want to be smarter, we could pick the first day of the selection as source, 
        // but typically users might set one day then click "Apply to All".
        // Let's take the first day in our list (Monday usually) if it has values.
        const monday = availability.find(a => a.day_of_week === 1);
        if (monday && monday.start_time && monday.end_time) {
            sourceSlot = monday;
        }

        const startTime = sourceSlot?.start_time || '09:00';
        const endTime = sourceSlot?.end_time || '17:00';

        setAvailability(prev => {
            // Creative a map for faster lookup
            const prevMap = new Map(prev.map(a => [a.day_of_week, a]));

            const newAvailability = [...prev];

            daysToApply.forEach(day => {
                const existingIndex = newAvailability.findIndex(a => a.day_of_week === day);
                if (existingIndex >= 0) {
                    newAvailability[existingIndex] = {
                        ...newAvailability[existingIndex],
                        start_time: startTime,
                        end_time: endTime
                    };
                } else {
                    newAvailability.push({
                        day_of_week: day,
                        start_time: startTime,
                        end_time: endTime
                    });
                }
            });

            return newAvailability;
        });

        toast.success("Applied to selected days");
    };

    const handleBulkApply = (type: 'weekdays' | 'all') => {
        const weekdays = [1, 2, 3, 4, 5]; // Mon-Fri
        const allDays = [0, 1, 2, 3, 4, 5, 6]; // Sun-Sat
        applyToAll(type === 'weekdays' ? weekdays : allDays);
    };

    const handleClearAll = () => {
        // Clear all slots but keep the structure empty or just remove them?
        // Let's just remove them from state implies unavailable
        setAvailability([]);
        toast.success("Cleared all availability");
    };

    // Check if there are unsaved changes
    const hasChanges = () => {
        // Normalize both arrays for comparison (strip seconds, sort, etc.)
        const normalize = (slots: AvailabilitySlot[]) => {
            return slots
                .filter(slot => slot.start_time && slot.end_time)
                .map(slot => ({
                    day_of_week: slot.day_of_week,
                    start_time: slot.start_time.substring(0, 5), // Strip seconds if any
                    end_time: slot.end_time.substring(0, 5),
                }))
                .sort((a, b) => a.day_of_week - b.day_of_week);
        };

        const current = normalize(availability);
        const original = normalize(originalAvailability);

        if (current.length !== original.length) return true;

        return JSON.stringify(current) !== JSON.stringify(original);
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-8">
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Mentor Availability
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Set your available hours for each day of the week. Students will only be able to book sessions during these times.
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Bulk Actions */}
                <div className="flex flex-wrap gap-2 pb-4 border-b border-border">
                    <Button variant="outline" size="sm" onClick={() => handleBulkApply('weekdays')}>
                        Apply Mon-Fri
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleBulkApply('all')}>
                        Apply All Days
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleClearAll} className="text-red-400 hover:text-red-300">
                        Clear All
                    </Button>
                    <p className="text-xs text-muted-foreground w-full mt-1">
                        * Sets all selected days to match Monday (or default 9am-5pm)
                    </p>
                </div>

                <div className="space-y-4">
                    {DAYS.map(day => {
                        const slot = getSlotForDay(day.value);

                        // Filter end time slots to only show times AFTER start time
                        const availableEndTimes = TIME_SLOTS.filter(t => !slot.start_time || t > slot.start_time);

                        return (
                            <div key={day.value} className="flex items-center gap-3">
                                <span className="w-24 text-sm font-medium">{day.label}</span>
                                <select
                                    value={slot.start_time}
                                    onChange={(e) => handleTimeChange(day.value, 'start_time', e.target.value)}
                                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm bg-neutral-950 text-white"
                                >
                                    <option value="">Unavailable</option>
                                    {TIME_SLOTS.map(time => (
                                        <option key={time} value={time}>{time}</option>
                                    ))}
                                </select>
                                <span className="text-sm text-neutral-400">to</span>
                                <select
                                    value={slot.end_time}
                                    onChange={(e) => handleTimeChange(day.value, 'end_time', e.target.value)}
                                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm bg-neutral-950 text-white"
                                    disabled={!slot.start_time}
                                >
                                    <option value="">Select end time</option>
                                    {availableEndTimes.map(time => (
                                        <option key={time} value={time}>{time}</option>
                                    ))}
                                </select>
                            </div>
                        );
                    })}

                    <Button
                        onClick={handleSaveAvailability}
                        disabled={saving || !hasChanges()}
                        className="w-full mt-4"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : hasChanges() ? 'Save Availability' : 'No Changes to Save'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
