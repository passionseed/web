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
  isFuture,
  isSameMonth,
  isAfter,
  startOfYear,
  endOfYear,
  addYears,
  subYears,
} from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReflectionData {
  date: Date;
  count: number;
}

const HeatmapCell = ({ count, date }: { count: number; date: string }) => {
  const getColor = (count: number) => {
    if (count === 0) return "bg-gray-200 dark:bg-gray-800";
    if (count < 2) return "bg-green-200 dark:bg-green-900";
    if (count < 4) return "bg-green-400 dark:bg-green-700";
    if (count < 6) return "bg-green-600 dark:bg-green-500";
    return "bg-green-800 dark:bg-green-300";
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div
            className={`w-3.5 h-3.5 rounded-sm ${getColor(count)} mx-[2px] my-[2px] transition-shadow hover:shadow-md`}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {count} reflections on {date}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const MonthlyHeatmap = React.memo(function MonthlyHeatmap({
  monthDate,
  dataMap,
}: {
  monthDate: Date;
  dataMap: Map<string, number>;
}) {
  if (isFuture(monthDate) && !isSameMonth(monthDate, new Date())) return null;

  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const heatmapData = daysInMonth
    .filter((day) => !isAfter(day, new Date()))
    .map((day) => ({
      date: day,
      count: dataMap.get(format(day, "yyyy-MM-dd")) || 0,
    }));

  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];
  const startingDayOfWeek = getDay(monthStart);

  const daysWithLeadingEmpty = [
    ...Array(startingDayOfWeek).fill(null),
    ...heatmapData,
  ];

  const weeks: (ReflectionData | null)[][] = [];
  for (let i = 0; i < daysWithLeadingEmpty.length; i += 7) {
    weeks.push(daysWithLeadingEmpty.slice(i, i + 7));
  }

  return (
    <div className="flex-shrink-0">
      <h4 className="font-semibold text-sm mb-1">
        {format(monthDate, "MMMM")}
      </h4>
      <table className="w-auto border-collapse">
        <thead>
          <tr>
            {weekDays.map((day, i) => (
              <th
                key={`${day}-${i}`}
                className="font-medium text-xs text-center p-0 pb-1"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((cell, di) =>
                cell ? (
                  <td key={format(cell.date, "yyyy-MM-dd")} className="p-0">
                    <HeatmapCell
                      count={cell.count}
                      date={format(cell.date, "MMMM d, yyyy")}
                    />
                  </td>
                ) : (
                  <td key={`empty-${wi}-${di}`} className="p-0">
                    <div className="w-3.5 h-3.5 mx-[2px] my-[2px]" />
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export function ReflectionHeatmap() {
  const [dataMap, setDataMap] = React.useState<Map<string, number>>(new Map());
  const [currentYear, setCurrentYear] = React.useState(
    new Date().getFullYear()
  );

  React.useEffect(() => {
    const fetchData = async () => {
      const reflections = await getReflectionCalendar(currentYear);
      const map = new Map<string, number>();
      reflections.forEach((r) => {
        const date = format(new Date(r.created_at), "yyyy-MM-dd");
        map.set(date, (map.get(date) || 0) + 1);
      });
      setDataMap(map);
    };
    fetchData();
  }, [currentYear]);

  const goToPreviousYear = () => setCurrentYear((prev) => prev - 1);
  const goToNextYear = () => setCurrentYear((prev) => prev + 1);

  const isNextYearFuture = currentYear + 1 > new Date().getFullYear();

  const months = Array.from(
    { length: 12 },
    (_, i) => new Date(currentYear, i, 1)
  );

  // Ref for scrolling
  const monthsContainerRef = React.useRef<HTMLDivElement>(null);

  // Scroll to rightmost on year change or initial render
  React.useEffect(() => {
    if (monthsContainerRef.current) {
      monthsContainerRef.current.scrollTo({
        left: monthsContainerRef.current.scrollWidth,
        behavior: "smooth",
      });
    }
  }, [currentYear, dataMap]);

  return (
    <div className="p-4 border rounded-lg bg-white dark:bg-neutral-900">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">Contribution Calendar</h3>
        <div className="flex items-center">
          <button
            onClick={goToPreviousYear}
            className="px-2 py-1 text-xs border rounded-md"
          >
            &lt;
          </button>
          <span className="font-bold text-sm mx-2 w-12 text-center">
            {currentYear}
          </span>
          <button
            onClick={goToNextYear}
            className={`px-2 py-1 text-xs border rounded-md ${isNextYearFuture ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={isNextYearFuture}
          >
            &gt;
          </button>
        </div>
      </div>
      <div
        className="flex overflow-x-auto space-x-6 pb-2"
        ref={monthsContainerRef}
      >
        {months.map((monthDate) => (
          <MonthlyHeatmap
            key={monthDate.getMonth()}
            monthDate={monthDate}
            dataMap={dataMap}
          />
        ))}
      </div>
    </div>
  );
}
