/**
 * useInlineEdit - Generic hook for inline editing functionality
 * Manages edit state, keyboard events, and validation
 */

import { useState, useCallback, useEffect, KeyboardEvent } from "react";

interface UseInlineEditProps<T = string> {
  initialValue: T;
  onSave: (value: T) => Promise<void>;
  validate?: (value: T) => string | null;
  maxLength?: number;
}

interface UseInlineEditReturn<T = string> {
  isEditing: boolean;
  value: T;
  originalValue: T;
  error: string | null;
  isSaving: boolean;
  startEdit: () => void;
  cancelEdit: () => void;
  setValue: (value: T) => void;
  saveEdit: () => Promise<void>;
  handleKeyDown: (e: KeyboardEvent) => void;
}

export function useInlineEdit<T = string>({
  initialValue,
  onSave,
  validate,
  maxLength,
}: UseInlineEditProps<T>): UseInlineEditReturn<T> {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<T>(initialValue);
  const [originalValue, setOriginalValue] = useState<T>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Update when initialValue changes from parent
  useEffect(() => {
    setValue(initialValue);
    setOriginalValue(initialValue);
  }, [initialValue]);

  const startEdit = useCallback(() => {
    setIsEditing(true);
    setError(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setValue(originalValue);
    setIsEditing(false);
    setError(null);
  }, [originalValue]);

  const saveEdit = useCallback(async () => {
    // Validate if validator provided
    if (validate) {
      const validationError = validate(value);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // Check max length if provided
    if (maxLength && typeof value === "string" && value.length > maxLength) {
      setError(`Maximum ${maxLength} characters allowed`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(value);
      setOriginalValue(value);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }, [value, validate, maxLength, onSave]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      }
    },
    [cancelEdit]
  );

  return {
    isEditing,
    value,
    originalValue,
    error,
    isSaving,
    startEdit,
    cancelEdit,
    setValue,
    saveEdit,
    handleKeyDown,
  };
}
