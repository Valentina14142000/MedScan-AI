import { useState } from 'react';
import type { HistoryItem } from '../types';
import { MODULES, moduleById } from '../data/modules';
import { download, toCsv } from '../lib/history';

export function History({ items, onClear }: { items: HistoryItem[]; onClear: () => void }) {
  const [armed, setArmed] = useState(false);
  const n = (f: (h: HistoryItem) => boolean) => items.filter(f).length;
  const names = Object.fromEntries(MODULES.map((m) => [m.id, m.name]));
  return (
    <section className="card" style={{ marginTop: 16 }}>
      <div className="row between">
        <h2 className="flush">Case history &amp; analytics</h2>
        {items.length > 0 && (
          <span className="row">
            <button className="btn" onClick={() => download('medscan-cases.csv', toCsv(items, names), 'text/csv')}>
              Export CSV
            </button>
            <button
              className="btn"
              onClick={() => {
                if (!armed) {
                  setArmed(true);
                  setTimeout(() => setArmed(false), 4000);
                } else {
                  setArmed(false);
                  onClear();
                }
              }}
            >
              {armed ? 'Click again to confirm' : 'Clear history'}
            </button>
          </span>
        )}
      </div>
      <p className="sub">Stored only in this browser. Images are never saved.</p>
      {items.length === 0 ? (
        <p className="sub">No cases yet. Analyses you run will be summarized here.</p>
      ) : (
        <>
          <div className="stats">
            <div className="stat"><b>{items.length}</b><span>Cases</span></div>
            <div className="stat"><b>{n((h) => h.follow_up === 'routine')}</b><span>Routine</span></div>
            <div className="stat"><b>{n((h) => h.follow_up !== 'routine')}</b><span>Soon or urgent</span></div>
          </div>
          {MODULES.map((m) => {
            const c = n((h) => h.module === m.id);
            return (
              <div key={m.id}>
                <div className="sub">{m.name}: {c}</div>
                <div className="bar"><i style={{ width: `${Math.round((c / items.length) * 100)}%` }} /></div>
              </div>
            );
          })}
          <div className="tw">
            <table>
              <thead><tr><th>Date</th><th>Module</th><th>Quality</th><th>Follow-up</th><th>Key observation</th></tr></thead>
              <tbody>
                {items.map((h) => (
                  <tr key={h.id}>
                    <td>{new Date(h.date).toLocaleDateString()}</td>
                    <td>{moduleById(h.module).name}</td>
                    <td>{h.quality}</td>
                    <td><span className={`pill ${h.follow_up}`}>{h.follow_up}</span></td>
                    <td>{h.key}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
