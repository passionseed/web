"use client";

interface ProgressIndicatorProps {
  current: number;
  total: number;
  language?: string;
}

export function ProgressIndicator({ current, total, language }: ProgressIndicatorProps) {
  const percentage = Math.round((current / total) * 100);
  const label = language === "th"
    ? `คำถามที่ ${current} จาก ${total}`
    : `Question ${current} of ${total}`;

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-400 mb-1.5">
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
