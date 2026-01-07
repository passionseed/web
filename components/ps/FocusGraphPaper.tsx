"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

interface FocusGraphPaperProps {
    data: {
        sessions: {
            duration_minutes: number;
            created_at: string;
            user_id: string | null;
        }[];
        userMap: Record<string, string>;
    };
    className?: string;
}

export function FocusGraphPaper({ data, className }: FocusGraphPaperProps) {
    console.log('[FocusGraphPaper] Received data:', data);
    console.log('[FocusGraphPaper] Sessions count:', data.sessions.length);
    console.log('[FocusGraphPaper] UserMap:', data.userMap);

    const chartData = useMemo(() => {
        const { sessions, userMap } = data;
        const result: { name: string; date: Date;[key: string]: any }[] = [];

        // Initialize last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });

            const dayData: any = { name: dateStr, date: d };

            // Initialize all users to 0
            Object.keys(userMap).forEach(uid => {
                dayData[userMap[uid]] = 0;
            });

            result.push(dayData);
        }

        // Aggregate data
        sessions.forEach(session => {
            const sessionDate = new Date(session.created_at).toISOString().split('T')[0];
            const dayEntry = result.find(r => r.date.toISOString().split('T')[0] === sessionDate);
            if (dayEntry && session.user_id) {
                const userName = userMap[session.user_id] || 'Unknown';
                dayEntry[userName] = (dayEntry[userName] || 0) + session.duration_minutes;
            }
        });

        return result;
    }, [data]);

    const userNames = useMemo(() => Object.values(data.userMap), [data]);
    const colors = ["#ef4444", "#3b82f6", "##22c55e", "#eab308", "#a855f7", "#ec4899", "#f97316"];

    console.log('[FocusGraphPaper] Chart data:', chartData);
    console.log('[FocusGraphPaper] User names:', userNames);
    console.log('[FocusGraphPaper] Chart data sample:', chartData[0]);

    return (
        <div
            className={cn(
                "rounded-sm p-6 flex flex-col relative overflow-hidden transition-all duration-500 ease-out min-h-[400px] border border-white/10",
                "bg-[#111827]/50", // Dark semi-transparent background
                className
            )}
        >
            <h3 className="text-xl font-bold font-sans mb-6 text-white border-b border-white/10 pb-2 flex items-center gap-2">
                Team Focus Trends (7 Days)
            </h3>

            <div className="w-full h-[300px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{
                            top: 5,
                            right: 30,
                            left: 0,
                            bottom: 5,
                        }}
                    >
                        <defs>
                            {userNames.map((name, index) => (
                                <linearGradient key={`gradient-${name}`} id={`gradient-${name.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}m`} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#1e293b",
                                border: "1px solid #334155",
                                borderRadius: "8px",
                                fontFamily: "var(--font-sans)",
                                color: "#f8fafc"
                            }}
                            itemStyle={{ fontSize: "12px", color: "#e2e8f0" }}
                            labelStyle={{ color: "#94a3b8", marginBottom: "0.25rem" }}
                            cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: "20px" }} />
                        {userNames.map((name, index) => (
                            <Area
                                key={name}
                                type="monotone"
                                dataKey={name}
                                stroke={colors[index % colors.length]}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill={`url(#gradient-${name.replace(/\s+/g, '')})`}
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
