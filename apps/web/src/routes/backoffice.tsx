import { Link } from "@tanstack/react-router";
import { buildBackofficeConfigSections } from "../presentation/backofficeView";

export function BackofficePage() {
  const sections = buildBackofficeConfigSections();

  return (
    <section className="page stack-gap">
      <div>
        <h2>Backoffice</h2>
        <p className="muted">Review the analysis and puzzle-classification constants currently shipped with the web app.</p>
      </div>

      <div className="config-notice">
        <strong>Benchmark tools</strong>
        <p className="muted">Run the bundled `single.pgn` benchmark to compare analysis timing across the currently supported runtime knobs.</p>
        <div className="inline-actions">
          <Link to="/backoffice/analysis-benchmark" className="action-button">Open analysis benchmark</Link>
        </div>
      </div>

      <div className="config-notice">
        <strong>Hardcoded config</strong>
        <p className="muted">These values are read-only for now and come directly from source constants.</p>
        <p className="muted">TODO: replace this with persisted admin config and safe validation before allowing edits.</p>
      </div>

      <div className="config-sections">
        {sections.map((section) => (
          <section key={section.id} className="config-section">
            <div className="config-section-header">
              <h3>{section.title}</h3>
              <p className="muted">{section.description}</p>
            </div>

            <div className="config-grid">
              {section.fields.map((field) => (
                <label key={field.key} className="config-field">
                  <span className="config-label">{field.label}</span>
                  <input className="config-input" value={field.value} readOnly aria-readonly="true" />
                  <span className="muted config-help">{field.help}</span>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
