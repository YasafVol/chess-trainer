import type { ReactNode } from "react";

type InlineLoaderProps = {
  label: string;
  detail?: string;
  inline?: boolean;
  children?: ReactNode;
};

export function InlineLoader(props: InlineLoaderProps) {
  return (
    <div className={props.inline ? "inline-loader inline-loader-compact" : "inline-loader"} role="status" aria-live="polite">
      <div className="inline-loader-spinner" aria-hidden="true" />
      <div>
        <strong>{props.label}</strong>
        {props.detail ? <p className="muted">{props.detail}</p> : null}
        {props.children}
      </div>
    </div>
  );
}

// TODO: replace this with customchess-loader once the bespoke loader asset/component is ready.
