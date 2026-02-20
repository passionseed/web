import { useState, useEffect, useCallback } from 'react';
import { DirectionFinderResult, AssessmentAnswers } from '@/types/direction-finder';

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface JobProgress {
  current: number;
  total: number;
}

interface JobSteps {
  core: JobStatus;
  programs: JobStatus;
  commitments: JobStatus;
}

interface PartialResults {
  core?: {
    profile: DirectionFinderResult['profile'];
    vectors: DirectionFinderResult['vectors'];
  };
  programs?: {
    programs: DirectionFinderResult['programs'];
  };
  commitments?: {
    commitments: DirectionFinderResult['commitments'];
  };
}

interface UseDirectionJobResult {
  // Job state
  jobId: string | null;
  status: JobStatus | null;
  progress: JobProgress | null;
  steps: JobSteps | null;

  // Results
  result: DirectionFinderResult | null;
  partialResults: PartialResults | null;
  error: string | null;

  // Actions
  startJob: (
    answers: AssessmentAnswers,
    history: any[],
    language?: 'en' | 'th',
    modelName?: string
  ) => Promise<void>;
  reset: () => void;

  // Flags
  isLoading: boolean;
  isPolling: boolean;
}

/**
 * React hook for managing direction finder background jobs
 *
 * Usage:
 * ```tsx
 * const { startJob, status, progress, result, error } = useDirectionJob();
 *
 * // Start a job
 * await startJob(answers, history, 'en');
 *
 * // Monitor progress
 * if (status === 'processing') {
 *   console.log(`Progress: ${progress.current}/${progress.total}`);
 * }
 *
 * // Get result when done
 * if (status === 'completed') {
 *   console.log(result);
 * }
 * ```
 */
export function useDirectionJob(): UseDirectionJobResult {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [steps, setSteps] = useState<JobSteps | null>(null);
  const [result, setResult] = useState<DirectionFinderResult | null>(null);
  const [partialResults, setPartialResults] = useState<PartialResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const triggerProcess = useCallback(async (targetJobId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/direction/process/${targetJobId}`, {
        method: 'POST',
      });

      if (!response.ok && response.status !== 202) {
        console.warn('Non-fatal process trigger response:', response.status);
      }
    } catch (err) {
      // Keep polling even if this trigger fails; status endpoint remains source of truth.
      console.warn('Failed to trigger process step:', err);
    }
  }, []);

  /**
   * Start a new direction finder job
   */
  const startJob = useCallback(async (
    answers: AssessmentAnswers,
    history: any[],
    language: 'en' | 'th' = 'en',
    modelName?: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/direction/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, history, language, modelName }),
      });

      if (!response.ok) {
        throw new Error('Failed to create job');
      }

      const data = await response.json();
      setJobId(data.jobId);
      setStatus('pending');
      setIsPolling(true);
      await triggerProcess(data.jobId);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start job');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [triggerProcess]);

  /**
   * Poll for job status
   */
  useEffect(() => {
    if (!jobId || !isPolling) return;

    const pollInterval = setInterval(async () => {
      try {
        await triggerProcess(jobId);
        const response = await fetch(`/api/direction/status/${jobId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch job status');
        }

        const data = await response.json();

        setStatus(data.status);
        setProgress(data.progress);
        setSteps(data.steps);
        setPartialResults(data.partialResults || null);

        // Update result if completed
        if (data.status === 'completed') {
          setResult(data.result);
          setIsPolling(false);
        }

        // Update error if failed
        if (data.status === 'failed') {
          setError(data.error || 'Job failed');
          setIsPolling(false);
        }

      } catch (err) {
        console.error('Error polling job status:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
        setIsPolling(false);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [jobId, isPolling, triggerProcess]);

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setJobId(null);
    setStatus(null);
    setProgress(null);
    setSteps(null);
    setResult(null);
    setPartialResults(null);
    setError(null);
    setIsLoading(false);
    setIsPolling(false);
  }, []);

  return {
    jobId,
    status,
    progress,
    steps,
    result,
    partialResults,
    error,
    startJob,
    reset,
    isLoading,
    isPolling,
  };
}
