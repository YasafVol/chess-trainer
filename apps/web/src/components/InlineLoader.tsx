import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/utils.js";

type InlineLoaderProps = {
  label: string;
  detail?: string;
  inline?: boolean;
  children?: ReactNode;
};

export function InlineLoader(props: InlineLoaderProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-amber-50 px-3.5 py-3",
        props.inline ? "py-2 px-2.5" : "mt-3"
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-4.5 shrink-0 animate-spin text-amber-600" aria-hidden="true" />
      <div>
        <strong className="text-sm">{props.label}</strong>
        {props.detail ? <p className="text-sm text-muted-foreground">{props.detail}</p> : null}
        {props.children}
      </div>
    </div>
  );
}
