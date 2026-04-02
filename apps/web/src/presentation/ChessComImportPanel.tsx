import type { ChessComArchiveMonth } from "../domain/types.js";

type ChessComImportPanelProps = {
  username: string;
  archives: ChessComArchiveMonth[];
  loadingArchives: boolean;
  importing: boolean;
  status: string;
  startMonthId: string;
  endMonthId: string;
  backofficeHref: string;
  onDiscoverArchives: () => void;
  onStartMonthChange: (value: string) => void;
  onEndMonthChange: (value: string) => void;
  onImport: () => void;
};

export function ChessComImportPanel(props: ChessComImportPanelProps) {
  return (
    <section className="config-notice stack-gap">
      <div>
        <strong>Chess.com archive import</strong>
        <p className="muted">Import finished Chess.com archive months into the local library using the saved Backoffice username.</p>
      </div>

      {!props.username ? (
        <p className="muted">
          Configure a Chess.com username in <a href={props.backofficeHref}>Backoffice</a> before importing archive months.
        </p>
      ) : (
        <>
          <p className="muted">Saved username: <strong>{props.username}</strong></p>
          <div className="inline-actions">
            <button type="button" className="action-button" onClick={props.onDiscoverArchives} disabled={props.loadingArchives || props.importing}>
              {props.loadingArchives ? "Loading archives..." : "Load archive months"}
            </button>
            <button
              type="button"
              className="action-button"
              onClick={props.onImport}
              disabled={props.importing || props.loadingArchives || props.archives.length === 0 || !props.startMonthId || !props.endMonthId}
            >
              {props.importing ? "Importing archives..." : "Import selected archive range"}
            </button>
          </div>

          {props.archives.length > 0 ? (
            <div className="config-grid">
              <label className="config-field">
                <span className="config-label">Start month</span>
                <select
                  className="puzzle-select"
                  value={props.startMonthId}
                  onChange={(event) => props.onStartMonthChange(event.target.value)}
                >
                  {props.archives.map((archive) => (
                    <option key={archive.id} value={archive.id}>{archive.label}</option>
                  ))}
                </select>
              </label>

              <label className="config-field">
                <span className="config-label">End month</span>
                <select
                  className="puzzle-select"
                  value={props.endMonthId}
                  onChange={(event) => props.onEndMonthChange(event.target.value)}
                >
                  {props.archives.map((archive) => (
                    <option key={archive.id} value={archive.id}>{archive.label}</option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </>
      )}

      <p>{props.status}</p>
    </section>
  );
}
