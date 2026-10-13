import type { HistoryItem } from '../types';

const KEY = 'medscan:v1';

export function loadHistory(): HistoryItem[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? (v as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 200)));
  } catch {
    /* storage unavailable */
  }
}

export function download(filename: string, text: string, type = 'text/plain'): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function toCsv(items: HistoryItem[], names: Record<string, string>): string {
  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['date', 'module', 'image_quality', 'follow_up', 'key_observation'], ...items.map((h) => [h.date, names[h.module] ?? h.module, h.quality, h.follow_up, h.key])];
  return rows.map((r) => r.map(q).join(',')).join('\n');
}
