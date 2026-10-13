import { useRef, useState } from 'react';
import { Loader2, ScanLine, UploadCloud } from 'lucide-react';
import type { Analysis, HistoryItem, ModuleId } from '../types';
import { moduleById } from '../data/modules';
import { prepareImage } from '../lib/image';
import { analyzeImage } from '../lib/analyze';
import { ResultView } from './ResultView';

interface Props {
  moduleId: ModuleId;
  onDone: (item: HistoryItem) => void;
}

export function Workspace({ moduleId, onDone }: Props) {
  const mod = moduleById(moduleId);
  const [base64, setBase64] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hot, setHot] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState('');
  const ctl = useRef<AbortController | null>(null);

  async function pick(f?: File) {
    if (!f) return;
    if (!f.type.startsWith('image/')) return setStatus('Please choose an image file.');
    try {
      const { blob, base64: b64 } = await prepareImage(f);
      setBase64(b64);
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
      setStatus('');
      setResult(null);
      setError('');
    } catch (e) {
      setStatus((e as Error).message);
    }
  }

  async function run() {
    if (!base64) return;
    ctl.current = new AbortController();
    setBusy(true);
    setError('');
    setResult(null);
    setStatus('Scanning...');
    try {
      const r = await analyzeImage(moduleId, base64, note, ctl.current.signal);
      setResult(r);
      setStatus('Done.');
      if (r.image_type_match) {
        onDone({ id: Date.now(), module: moduleId, date: new Date().toISOString(), quality: r.quality, follow_up: r.follow_up, key: r.observations[0] ?? '' });
      }
    } catch (e) {
      setError((e as Error).message);
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid2">
      <section className="card">
        <h2>{mod.name} workspace</h2>
        <div
          className={`drop ${preview ? 'has' : ''} ${hot ? 'hot' : ''} ${busy ? 'scan' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setHot(true);
          }}
          onDragLeave={() => setHot(false)}
          onDrop={(e) => {
            e.preventDefault();
            setHot(false);
            void pick(e.dataTransfer.files[0]);
          }}
        >
          <input type="file" accept="image/*" aria-label="Choose an image" onChange={(e) => void pick(e.target.files?.[0])} />
          <div className="inner">
            <UploadCloud size={34} />
            <div className="strong">Drop an image or click to browse</div>
            <div className="sub">JPG or PNG, resized on your device</div>
          </div>
          {preview && <img src={preview} alt="Selected image preview" />}
          <div className="scanline" />
        </div>
        <h3>Question or context (optional)</h3>
        <textarea value={note} maxLength={400} onChange={(e) => setNote(e.target.value)} placeholder="e.g. The image looks dark, is it usable? No personal details please." />
        <label className="check">
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
          <span>I confirm this image is public or fully de-identified and I understand this is not a diagnosis.</span>
        </label>
        <div className="row">
          <button className="btn primary" disabled={!base64 || !ok || busy} onClick={() => void run()}>
            {busy ? <Loader2 size={16} className="spin" /> : <ScanLine size={16} />} Analyze image
          </button>
          {busy && (
            <button className="btn" onClick={() => ctl.current?.abort()}>
              Stop
            </button>
          )}
          <span className="sub" role="status">
            {status}
          </span>
        </div>
      </section>
      <section className="card">
        <h2>Report</h2>
        {error && <div className="msg">{error}</div>}
        {result ? (
          <ResultView result={result} module={mod} />
        ) : (
          !error && (
            <div className="empty">
              <div>
                <div className="mono accent">{'// awaiting scan'}</div>
                <div className="sub">Your structured analysis appears here.</div>
              </div>
            </div>
          )
        )}
      </section>
    </div>
  );
}
