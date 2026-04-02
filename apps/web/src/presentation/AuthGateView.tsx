import type { AuthGateViewModel } from "./authGateModel.js";

export function AuthGateView(props: {
  model: AuthGateViewModel;
  signingIn: boolean;
  signInError: string | null;
  onSignIn: () => void | Promise<void>;
}) {
  return (
    <section className="page auth-gate">
      <div className="auth-gate-hero">
        <div className="auth-gate-copy stack-gap">
          <div className="auth-gate-eyebrow-row">
            <span className="auth-gate-eyebrow">{props.model.eyebrow}</span>
            <span className="auth-gate-route">{props.model.routeLabel}</span>
          </div>
          <div className="stack-gap-sm">
            <h2>{props.model.title}</h2>
            <p className="muted auth-gate-summary">{props.model.summary}</p>
          </div>
          <div className="auth-gate-actions">
            <button type="button" className="action-button" onClick={() => void props.onSignIn()} disabled={props.signingIn}>
              {props.signingIn ? "Connecting..." : "Continue with Google"}
            </button>
            <p className="muted auth-gate-hint">{props.model.routeHint}</p>
          </div>
          {props.signInError ? <p className="muted auth-gate-error">{props.signInError}</p> : null}
        </div>

        <aside className="auth-gate-panel" aria-label={props.model.featureHeading}>
          <p className="auth-gate-panel-label">{props.model.featureHeading}</p>
          <div className="auth-gate-feature-grid">
            {props.model.features.map((feature) => (
              <article key={feature.title} className="auth-gate-feature-card">
                <h3>{feature.title}</h3>
                <p className="muted">{feature.description}</p>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
