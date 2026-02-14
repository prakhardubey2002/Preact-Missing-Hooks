/**
 * useWorkerNotifications – listen to worker messages and maintain running state, counts, history, and derived stats.
 * @module useWorkerNotifications
 */

import { useState, useRef, useEffect, useMemo } from "preact/hooks";

/** Supported worker event types for tracking. Worker should postMessage with these shapes. */
export type WorkerEventType =
  | "task_start"
  | "task_end"
  | "task_fail"
  | "queue_size";

export interface WorkerNotificationEvent {
  type: WorkerEventType;
  taskId?: string;
  duration?: number;
  error?: string;
  size?: number;
  timestamp: number;
}

export interface UseWorkerNotificationsOptions {
  /** Max events to keep in history. Default 100. */
  maxHistory?: number;
  /** Window in ms for throughput calculation (completed per second). Default 1000. */
  throughputWindowMs?: number;
}

export interface UseWorkerNotificationsReturn {
  /** Task IDs currently running (received task_start, not yet task_end/task_fail). */
  runningTasks: string[];
  /** Total tasks that completed successfully. */
  completedCount: number;
  /** Total tasks that failed. */
  failedCount: number;
  /** Recent events (oldest first), capped at maxHistory. */
  eventHistory: WorkerNotificationEvent[];
  /** Average task duration in ms (from task_end events that include duration). */
  averageDurationMs: number;
  /** Completed tasks per second over the throughput window. */
  throughputPerSecond: number;
  /** Last reported queue size (from queue_size events); 0 if never sent. */
  currentQueueSize: number;
  /** Default view: all active worker data and progress in one object. */
  progress: {
    runningTasks: string[];
    completedCount: number;
    failedCount: number;
    averageDurationMs: number;
    throughputPerSecond: number;
    currentQueueSize: number;
    totalProcessed: number;
    recentEventCount: number;
  };
}

function parseMessage(data: unknown): WorkerNotificationEvent | null {
  if (data == null || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const type = d.type as string;
  if (
    type !== "task_start" &&
    type !== "task_end" &&
    type !== "task_fail" &&
    type !== "queue_size"
  ) {
    return null;
  }
  const taskId = typeof d.taskId === "string" ? d.taskId : undefined;
  const duration = typeof d.duration === "number" ? d.duration : undefined;
  const error = typeof d.error === "string" ? d.error : undefined;
  const size = typeof d.size === "number" ? d.size : undefined;
  return {
    type: type as WorkerEventType,
    taskId,
    duration,
    error,
    size,
    timestamp: Date.now(),
  };
}

/**
 * Listens to a Worker's messages and maintains state: running tasks, completed/failed counts,
 * event history, execution time per task, average duration, throughput per second, and queue size.
 * Worker should postMessage with: { type: 'task_start'|'task_end'|'task_fail'|'queue_size', taskId?, duration?, error?, size? }.
 *
 * @param worker - The Worker instance to listen to, or null/undefined to listen to nothing.
 * @param options - Optional maxHistory and throughputWindowMs.
 * @returns State and derived stats plus a default progress object.
 */
export function useWorkerNotifications(
  worker: Worker | null | undefined,
  options: UseWorkerNotificationsOptions = {}
): UseWorkerNotificationsReturn {
  const { maxHistory = 100, throughputWindowMs = 1000 } = options;

  const [runningTasks, setRunningTasks] = useState<string[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [eventHistory, setEventHistory] = useState<WorkerNotificationEvent[]>(
    []
  );
  const [currentQueueSize, setCurrentQueueSize] = useState(0);

  const completedTimestampsRef = useRef<number[]>([]);
  const durationSumRef = useRef(0);
  const durationCountRef = useRef(0);

  useEffect(() => {
    if (!worker) return;

    const onMessage = (e: MessageEvent) => {
      const ev = parseMessage(e.data);
      if (!ev) return;

      setEventHistory((prev) => {
        const next = [...prev, ev].slice(-maxHistory);
        return next;
      });

      if (ev.type === "task_start" && ev.taskId) {
        setRunningTasks((prev) =>
          prev.includes(ev.taskId!) ? prev : [...prev, ev.taskId!]
        );
      } else if (ev.type === "task_end") {
        if (ev.taskId) {
          setRunningTasks((prev) => prev.filter((id) => id !== ev.taskId));
        }
        setCompletedCount((c) => c + 1);
        const cutoff = Date.now() - throughputWindowMs;
        completedTimestampsRef.current = [
          ...completedTimestampsRef.current.filter((t) => t >= cutoff),
          ev.timestamp,
        ];
        if (typeof ev.duration === "number") {
          durationSumRef.current += ev.duration;
          durationCountRef.current += 1;
        }
      } else if (ev.type === "task_fail") {
        if (ev.taskId) {
          setRunningTasks((prev) => prev.filter((id) => id !== ev.taskId));
        }
        setFailedCount((c) => c + 1);
      } else if (ev.type === "queue_size" && typeof ev.size === "number") {
        setCurrentQueueSize(ev.size);
      }
    };

    worker.addEventListener("message", onMessage);
    return () => worker.removeEventListener("message", onMessage);
  }, [worker, maxHistory]);

  const averageDurationMs = useMemo(() => {
    const count = durationCountRef.current;
    const sum = durationSumRef.current;
    return count > 0 ? sum / count : 0;
  }, [eventHistory]);

  const throughputPerSecond = useMemo(() => {
    const now = Date.now();
    const cutoff = now - throughputWindowMs;
    const timestamps = completedTimestampsRef.current.filter(
      (t) => t >= cutoff
    );
    return timestamps.length / (throughputWindowMs / 1000);
  }, [eventHistory, throughputWindowMs]);

  const progress = useMemo(
    () => ({
      runningTasks,
      completedCount,
      failedCount,
      averageDurationMs,
      throughputPerSecond,
      currentQueueSize,
      totalProcessed: completedCount + failedCount,
      recentEventCount: eventHistory.length,
    }),
    [
      runningTasks,
      completedCount,
      failedCount,
      averageDurationMs,
      throughputPerSecond,
      currentQueueSize,
      eventHistory.length,
    ]
  );

  return {
    runningTasks,
    completedCount,
    failedCount,
    eventHistory,
    averageDurationMs,
    throughputPerSecond,
    currentQueueSize,
    progress,
  };
}
