import { useState } from 'react';
import { FileCode2, ChevronDown, Copy, Check } from 'lucide-react';
import type { CodeBlock } from '../types';

export default function CodeViewer({ blocks }: { blocks: CodeBlock[] }) {
  const [openIndex, setOpenIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} className="glass-panel overflow-hidden">
            <button
              onClick={() => setOpenIndex(isOpen ? -1 : i)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-clinical-800/50 transition-colors"
            >
              <FileCode2 className="w-4 h-4 text-med-400 flex-shrink-0" />
              <span className="text-sm font-mono text-slate-300 flex-1 text-left">{block.filename}</span>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="border-t border-clinical-700/60 animate-slide-up">
                <div className="flex items-center justify-between px-4 py-2 bg-clinical-900/50">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{block.language}</span>
                  <button
                    onClick={() => handleCopy(block.code)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-med-300 transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed max-h-96 overflow-y-auto">
                  <code dangerouslySetInnerHTML={{ __html: highlightPython(block.code) }} />
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function highlightPython(code: string): string {
  // Simple syntax highlighting for Python
  const keywords = [
    'import', 'from', 'class', 'def', 'return', 'if', 'else', 'elif', 'for',
    'while', 'try', 'except', 'with', 'as', 'self', 'None', 'True', 'False',
    'super', 'in', 'not', 'and', 'or', 'is', 'lambda', 'yield', 'raise',
    'pass', 'break', 'continue', 'global', 'nonlocal', 'assert', 'del',
  ];
  const builtins = ['torch', 'nn', 'np', 'cv2', 'numpy', 'print', 'len', 'range', 'max', 'min', 'float', 'int', 'str'];

  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Comments
  html = html.replace(/(#[^\n]*)/g, '<span style="color:#4a5568">$1</span>');

  // Strings (triple quotes first)
  html = html.replace(/("""[\s\S]*?""")/g, '<span style="color:#22d3ee">$1</span>');
  html = html.replace(/('[^'\n]*'|"[^"\n]*")/g, '<span style="color:#22d3ee">$1</span>');

  // Keywords
  keywords.forEach((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, 'g');
    html = html.replace(regex, `<span style="color:#f59e0b;font-weight:500">${kw}</span>`);
  });

  // Builtins
  builtins.forEach((b) => {
    const regex = new RegExp(`\\b${b}\\b`, 'g');
    html = html.replace(regex, `<span style="color:#38bdf8">${b}</span>`);
  });

  // Numbers
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#10b981">$1</span>');

  // Function definitions
  html = html.replace(/(<span[^>]*>def<\/span>) (\w+)/g, '$1 <span style="color:#a5f3fc">$2</span>');

  // Class definitions
  html = html.replace(/(<span[^>]*>class<\/span>) (\w+)/g, '$1 <span style="color:#a5f3fc">$2</span>');

  return html;
}
