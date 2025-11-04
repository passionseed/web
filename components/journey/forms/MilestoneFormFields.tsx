/**
 * MilestoneFormFields - Reusable form field components for milestone creation/editing
 * Small, modular components following single responsibility principle
 */

"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MilestoneStatus } from "@/types/journey";

// ========================================
// TITLE FIELD
// ========================================
interface TitleFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export function TitleField({ value, onChange, disabled, error }: TitleFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="milestone-title" className="text-slate-200">
        Title <span className="text-red-400">*</span>
      </Label>
      <Input
        id="milestone-title"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter milestone title"
        disabled={disabled}
        maxLength={500}
        className="bg-slate-900 border-slate-700 text-slate-100 focus:ring-inset"
      />
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">{value.length} / 500 characters</span>
        {error && <span className="text-red-400">{error}</span>}
      </div>
    </div>
  );
}

// ========================================
// DESCRIPTION FIELD
// ========================================
interface DescriptionFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function DescriptionField({ value, onChange, disabled }: DescriptionFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="milestone-description" className="text-slate-200">
        Description
      </Label>
      <Textarea
        id="milestone-description"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Brief description of this milestone"
        disabled={disabled}
        rows={3}
        maxLength={2000}
        className="bg-slate-900 border-slate-700 text-slate-100 resize-none"
      />
      <span className="text-xs text-slate-500">{value.length} / 2000 characters</span>
    </div>
  );
}

// ========================================
// DETAILS FIELD
// ========================================
interface DetailsFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function DetailsField({ value, onChange, disabled }: DetailsFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="milestone-details" className="text-slate-200">
        Detailed Notes
      </Label>
      <Textarea
        id="milestone-details"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add detailed notes, requirements, or context"
        disabled={disabled}
        rows={6}
        maxLength={10000}
        className="bg-slate-900 border-slate-700 text-slate-100 resize-none"
      />
      <span className="text-xs text-slate-500">{value.length} / 10,000 characters</span>
    </div>
  );
}

// ========================================
// PROGRESS SLIDER
// ========================================
interface ProgressSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function ProgressSlider({ value, onChange, disabled }: ProgressSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-slate-200">Progress</Label>
        <span className="text-sm font-medium text-slate-300">{value}%</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
        max={100}
        step={5}
        disabled={disabled}
        className="cursor-pointer"
      />
    </div>
  );
}

// ========================================
// STATUS SELECTOR
// ========================================
interface StatusSelectorProps {
  value: MilestoneStatus;
  onChange: (value: MilestoneStatus) => void;
  disabled?: boolean;
}

export function StatusSelector({ value, onChange, disabled }: StatusSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="milestone-status" className="text-slate-200">
        Status
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-700">
          <SelectItem value="not_started" className="text-slate-100">
            Not Started
          </SelectItem>
          <SelectItem value="in_progress" className="text-slate-100">
            In Progress
          </SelectItem>
          <SelectItem value="completed" className="text-slate-100">
            Completed
          </SelectItem>
          <SelectItem value="blocked" className="text-slate-100">
            Blocked
          </SelectItem>
          <SelectItem value="skipped" className="text-slate-100">
            Skipped
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
