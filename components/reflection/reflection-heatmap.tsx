"use client";

import * as React from "react";
import { getReflectionCalendar } from "@/lib/supabase/reflection";
import {
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  format,
  getDay,
  addMonths,
} from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ReflectionData {
  date: Date;
  count: number;
}

const HeatmapCell = ({
  count,
  date,
}: {
  count: number;
  date: string;
}) => {
  const getColor = (count: number) => {
    if (count === 0) return "bg-gray-200 dark:bg-gray-800";
    if (count < 2) return "bg-green-200 dark:bg-green-900";
    if (count < 4) return "bg-green-400 dark:bg-green-700";
    if (count < 6) return "bg-green-600 dark:bg-green-500";
    return "bg-green-800 dark:bg-green-300";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`w-3.5 h-3.5 rounded-sm ${getColor(count)}`}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>{count} reflections on {date}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export function ReflectionHeatmap() {
  const [data, setData] = React.useState<ReflectionData[]>([]);
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  React.useEffect(() => {
    const fetchData = async () => {
      const year = currentMonth.getFullYear();
      const reflections = await getReflectionCalendar(year);

      // Group reflections by date on the client to respect local timezone
      const dataMap = new Map<string, number>();
      reflections.forEach(r => {
        const date = format(new Date(r.created_at), "yyyy-MM-dd");
        dataMap.set(date, (dataMap.get(date) || 0) + 1);
      });

      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

      const heatmapData = daysInMonth.map(day => ({
        date: day,
        count: dataMap.get(format(day, "yyyy-MM-dd")) || 0,
      }));
      setData(heatmapData);
    };
    fetchData();
  }, [currentMonth]);

  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  const firstDayOfMonth = startOfMonth(currentMonth);
  const startingDayOfWeek = getDay(firstDayOfMonth);
  const emptyDays = Array(startingDayOfWeek).fill(null);
  
  const goToPreviousMonth = () => setCurrentMonth(prev => addMonths(prev, -1));
  const goToNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  return (
    <div className="p-2 border rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-sm">{format(currentMonth, "MMM yyyy")}</h3>
        <div>
          <button onClick={goToPreviousMonth} className="px-2 py-1 text-xs border rounded-md">&lt;</button>
          <button onClick={goToNextMonth} className="px-2 py-1 text-xs border rounded-md ml-1">&gt;</button>
        </div>
      </div>
      <div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {weekDays.map((day, i) => <div key={`${day}-${i}`} className="font-medium">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 mt-1">
          {emptyDays.map((_, i) => <div key={`empty-${i}`} className="w-3.5 h-3.5" />)}
          {data.map(({ date, count }) => (
            <HeatmapCell
              key={format(date, "yyyy-MM-dd")}
              count={count}
              date={format(date, "MMMM d, yyyy")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}