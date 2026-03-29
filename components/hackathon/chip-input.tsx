"use client";

import React, { useState, useCallback, KeyboardEvent } from "react";
import { X } from "lucide-react";

interface ChipInputProps {
  label: string;
  labelEn?: string;
  prompt: string;
  value: string[];
  onChange: (chips: string[]) => void;
  placeholder?: string;
  maxChips?: number;
  maxChars?: number;
  minChips?: number;
  error?: string;
}

export function ChipInput({
  label,
  labelEn,
  prompt,
  value,
  onChange,
  placeholder = "",
  maxChips = 5,
  maxChars = 50,
  minChips = 1,
  error,
}: ChipInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addChip = useCallback(
    (chipText: string) => {
      const trimmed = chipText.trim();
      if (!trimmed) return;

      // Check max length
      if (trimmed.length > maxChars) return;

      // Check max chips
      if (value.length >= maxChips) return;

      // Check for duplicates (case-insensitive)
      const isDuplicate = value.some(
        (existing) => existing.toLowerCase() === trimmed.toLowerCase()
      );
      if (isDuplicate) return;

      onChange([...value, trimmed]);
    },
    [value, onChange, maxChips, maxChars]
  );

  const removeChip = useCallback(
    (index: number) => {
      const newChips = value.filter((_, i) => i !== index);
      onChange(newChips);
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        if (inputValue.trim()) {
          addChip(inputValue);
          setInputValue("");
        }
      } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
        // Remove last chip on backspace when input is empty
        removeChip(value.length - 1);
      }
    },
    [inputValue, value, addChip, removeChip]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      // Prevent typing comma directly - it triggers add
      if (newValue.includes(",")) {
        const parts = newValue.split(",");
        const firstPart = parts[0].trim();
        if (firstPart) {
          addChip(firstPart);
        }
        setInputValue(parts[1] || "");
      } else if (newValue.length <= maxChars) {
        setInputValue(newValue);
      }
    },
    [addChip, maxChars]
  );

  const isMaxReached = value.length >= maxChips;
  const chipCountText = `${value.length}/${maxChips}`;

  return (
    <div className="w-full">
      {/* Label Section */}
      <div className="mb-2">
        <label className="ei-label dawn-theme flex flex-col gap-0.5">
          <span className="text-[#e2e8f0] font-medium">
            {label}
          </span>
          {labelEn && (
            <span className="text-[#64748b] text-xs font-normal">
              {labelEn}
            </span>
          )}
        </label>
      </div>

      {/* Prompt */}
      <p className="text-[#94a3b8] text-sm mb-3">
        {prompt}
      </p>

      {/* Chips Container */}
      <div
        className={`
          min-h-[48px] w-full
          flex flex-wrap items-center gap-2
          px-3 py-2
          rounded-[10px]
          border transition-all duration-200
          ${error
            ? "border-red-400/50 bg-red-500/5"
            : "border-white/[0.08] bg-white/[0.03] hover:border-indigo-400/30 hover:bg-white/[0.05]"
          }
          ${isMaxReached ? "border-indigo-400/30" : ""}
          focus-within:border-indigo-400/50 focus-within:bg-white/[0.06]
          focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]
        `}
      >
        {/* Existing Chips */}
        {value.map((chip, index) => (
          <div
            key={`${chip}-${index}`}
            className="
              inline-flex items-center gap-1.5
              px-2.5 py-1
              rounded-full
              bg-gradient-to-r from-blue-500/20 to-violet-500/20
              border border-indigo-400/30
              text-[#e2e8f0] text-sm
              animate-in fade-in zoom-in duration-200
              max-w-[200px] sm:max-w-[250px]
            "
          >
            <span className="truncate">{chip}</span>
            <button
              type="button"
              onClick={() => removeChip(index)}
              className="
                flex-shrink-0
                w-4 h-4
                flex items-center justify-center
                rounded-full
                text-[#94a3b8]
                hover:text-white hover:bg-white/10
                transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-indigo-400/50
              "
              aria-label={`Remove ${chip}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* Input Field */}
        {!isMaxReached && (
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ""}
            className="
              flex-1 min-w-[120px]
              bg-transparent
              text-[#e2e8f0] text-sm
              placeholder:text-[#64748b]
              outline-none
              py-1
            "
            maxLength={maxChars}
          />
        )}
      </div>

      {/* Helper Text / Error / Count */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex-1">
          {error ? (
            <span className="text-red-400 text-xs">{error}</span>
          ) : value.length < minChips ? (
            <span className="text-[#64748b] text-xs">
              กรุณาเพิ่มอย่างน้อย {minChips} รายการ (Please add at least {minChips} item{minChips > 1 ? "s" : ""})
            </span>
          ) : null}
        </div>
        <span
          className={`
            text-xs font-medium
            ${isMaxReached ? "text-indigo-400" : "text-[#64748b]"}
          `}
        >
          {chipCountText}
        </span>
      </div>
    </div>
  );
}

export default ChipInput;
