import { useEffect, useState } from "react";

/**
 * useDebounce - Delays updating a value until a specified delay has passed.
 * Used to debounce search inputs and other frequent updates to prevent
 * excessive re-renders or API calls.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
