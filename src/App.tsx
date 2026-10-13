import { useState } from 'react';
import { Activity, AlertTriangle, Brain, Fingerprint, ScanLine } from 'lucide-react';
import type { HistoryItem, ModuleId } from './types';
import { MODULES } from './data/modules';
import { loadHistory, saveHistory } from './lib/history';
import { Workspace } from './components/Workspace';
import { History } from './components/History';

const ICONS: Record<ModuleId, typeof Brain> = { xray: ScanLine, mri: Brain, skin: Fingerprint };

export default function App() {
  const [mod, setMod] = useState<ModuleId>('xray');
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);

  const add = (item: HistoryItem) =>
    setHistory((h) => {
      const next = [item, ...h].slice(0, 200);
      saveHistory(next);
      return next;
    });

  return (
    <main className="shell">
      <header className="top">
        <div className="logo"><Activity size={26} color="#04141c" strokeWidth={2.4} /></div>
        <div>
          <h1>MedScan <span className="grad">AI</span></h1>
          <div className="tag mono">Educational image review</div>
        </div>
      </header>

      <div className="note" role="note">
        <AlertTriangle size={20} />
        <div>
          <b>Not a medical device.</b> It does not diagnose or treat anything and must not guide medical decisions. Results can be wrong. Upload only public or fully de-identified images. For health worries see a clinician; in an emergency call your local emergency number.
        </div>
      </div>

      <div className="mods" role="tablist">
        {MODULES.map((m) => {
          const Icon = ICONS[m.id];
          return (
            <button key={m.id} role="tab" className="mod" aria-selected={mod === m.id} onClick={() => setMod(m.id)}>
              <span className="ic"><Icon size={22} /></span>
              <span><b>{m.name}</b><small>{m.sub}</small></span>
            </button>
          );
        })}
      </div>

      <Workspace key={mod} moduleId={mod} onDone={add} />
      <History items={history} onClear={() => { setHistory([]); saveHistory([]); }} />
      <footer className="sub mono">Not a diagnosis · learning and research only</footer>
    </main>
  );
}
