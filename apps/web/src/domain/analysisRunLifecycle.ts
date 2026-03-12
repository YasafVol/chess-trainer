import type { AnalysisRun } from "./types";

type RunStatus = AnalysisRun["status"];

export type RunEvent = "start" | "complete" | "cancel" | "fail";

export type FinalizeRunInput = {
  run: AnalysisRun;
  outcome: Extract<RunStatus, "completed" | "cancelled" | "failed">;
  completedAt: string;
  retriesUsed?: number;
  stoppedByBudget?: boolean;
  foregroundBudgetMs?: number;
  failureMessage?: string;
};

const TERMINAL_STATUSES: RunStatus[] = ["completed", "failed", "cancelled"];

export function transitionRunStatus(current: RunStatus, event: RunEvent): RunStatus {
  if (TERMINAL_STATUSES.includes(current)) {
    return current;
  }

  if (current === "queued" && event === "start") {
    return "running";
  }

  if (current === "running" && event === "complete") {
    return "completed";
  }

  if (current === "running" && event === "cancel") {
    return "cancelled";
  }

  if (current === "running" && event === "fail") {
    return "failed";
  }

  return current;
}

function completionMessage(
  input: Pick<FinalizeRunInput, "outcome" | "retriesUsed" | "stoppedByBudget" | "foregroundBudgetMs" | "failureMessage">
): string | undefined {
  if (input.outcome === "failed") {
    return input.failureMessage ?? "Unknown analysis error";
  }

  if (input.stoppedByBudget) {
    const budgetText = input.foregroundBudgetMs ? `${input.foregroundBudgetMs}ms` : "current limit";
    return `Stopped after derived runtime safety budget (${budgetText}); rerun to continue refining.`;
  }

  if ((input.retriesUsed ?? 0) > 0) {
    const retries = input.retriesUsed ?? 0;
    return `Completed with ${retries} ${retries === 1 ? "retry" : "retries"}.`;
  }

  return undefined;
}

export function finalizeRun(input: FinalizeRunInput): AnalysisRun {
  return {
    ...input.run,
    status: input.outcome,
    completedAt: input.completedAt,
    error: completionMessage(input)
  };
}
