import { Download } from 'lucide-react';
import type { Analysis } from '../types';
import type { ModuleInfo } from '../data/modules';
import { download } from '../lib/history';

const List = ({ items }: { items: string[] }) =>
  items.length ? (
    <ul className="ms-list">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  ) : (
    <p className="sub">None.</p>
  );

export function ResultView({ result, module }: { result: Analysis; module: ModuleInfo }) {
  if (!result.image_type_match) {
    return (
      <div className="msg">
        This does not look like {module.desc}. {result.quality_note} Pick the matching workspace or upload a suitable image.
      </div>
    );
  }
  const report = () =>
    download(
      'medscan-report.txt',
      `MedScan AI report (${module.name}) ${new Date().toISOString()}\nNOT A DIAGNOSIS. For learning and research only.\n\nImage quality: ${result.quality} - ${result.quality_note}\n\nObservations:\n- ${result.observations.join('\n- ')}\n\nConsiderations:\n- ${result.considerations.join('\n- ')}\n\nFollow-up (${result.follow_up}): ${result.follow_up_note}\n${module.care}\n\nLimitations: ${result.limitations}\n`,
    );
  return (
    <div className="fade-in">
      <div className="row">
        <span className={`pill ${result.follow_up}`}>Follow-up: {result.follow_up}</span>
        <span className="sub mono">quality: {result.quality}</span>
      </div>
      <p className="sub">{result.quality_note}</p>
      <h3>Visible observations</h3>
      <List items={result.observations} />
      <h3>A clinician may consider</h3>
      <List items={result.considerations} />
      <h3>General guidance</h3>
      <p className="flush">
        {result.follow_up_note} {module.care}
      </p>
      <h3>Limitations</h3>
      <p className="sub flush">{result.limitations} This is not a diagnosis.</p>
      <button className="btn" style={{ marginTop: 14 }} onClick={report}>
        <Download size={16} /> Download report
      </button>
    </div>
  );
}
