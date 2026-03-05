const TERMINAL_STATUSES = ["completed", "failed", "cancelled"];
export function transitionRunStatus(current, event) {
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
function completionMessage(input) {
    if (input.outcome === "failed") {
        return input.failureMessage ?? "Unknown analysis error";
    }
    if (input.stoppedByBudget) {
        return "Stopped after foreground runtime budget; rerun to continue refining.";
    }
    if ((input.retriesUsed ?? 0) > 0) {
        const retries = input.retriesUsed ?? 0;
        return `Completed with ${retries} ${retries === 1 ? "retry" : "retries"}.`;
    }
    return undefined;
}
export function finalizeRun(input) {
    return {
        ...input.run,
        status: input.outcome,
        completedAt: input.completedAt,
        error: completionMessage(input)
    };
}
