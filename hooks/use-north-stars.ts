"use client";

import { useState, useEffect, useCallback } from "react";
import { NorthStar } from "@/types/journey";
import {
  getNorthStars,
  createNorthStar,
  updateNorthStar,
  deleteNorthStar,
  getNorthStarById,
} from "@/lib/supabase/north-star";
import { toast } from "sonner";

export function useNorthStars() {
  const [northStars, setNorthStars] = useState<NorthStar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadNorthStars = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getNorthStars();
      setNorthStars(data);
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error("Error loading North Stars:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNorthStars();
  }, [loadNorthStars]);

  const refreshNorthStars = useCallback(() => {
    return loadNorthStars();
  }, [loadNorthStars]);

  return {
    northStars,
    isLoading,
    error,
    refreshNorthStars,
  };
}

export function useNorthStar(id: string | null) {
  const [northStar, setNorthStar] = useState<NorthStar | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setNorthStar(null);
      return;
    }

    const loadNorthStar = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getNorthStarById(id);
        setNorthStar(data);
      } catch (err) {
        const error = err as Error;
        setError(error);
        console.error("Error loading North Star:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNorthStar();
  }, [id]);

  return {
    northStar,
    isLoading,
    error,
  };
}
