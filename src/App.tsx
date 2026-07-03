import { useState } from 'react';
import { Activity, Stethoscope, Brain, Microscope, BarChart3, Settings, ChevronRight } from 'lucide-react';
import { moduleConfigs } from './data/moduleConfigs';
import type { ModuleId } from './types';
import AnalyticsOverview from './components/AnalyticsOverview';
import DiagnosticWorkspace from './components/DiagnosticWorkspace';

type View = 'analytics' | ModuleId;

const iconMap: Record<string, typeof Activity> = {
  Stethoscope,
  Brain,
  Microscope,
};

export default function App() {
  const [view, setView] = useState<View>('analytics');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeModule = moduleConfigs.find((m) => m.id === view);

  return (
    <div className="flex h-screen overflow-hidden bg-clinical-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:relative z-40 w-72 h-full flex flex-col bg-clinical-900 border-r border-clinical-700/60 transition-transform duration-300`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-clinical-700/60">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-med-500 to-electric-600 flex items-center justify-center med-glow">
              <Activity className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-clinical-900 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">MedScan AI</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Diagnostic Platform</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Overview</p>
          <NavButton
            active={view === 'analytics'}
            onClick={() => { setView('analytics'); setSidebarOpen(false); }}
            icon={BarChart3}
            label="Global Analytics"
            sublabel="Cross-module dashboard"
          />

          <p className="px-3 pt-4 pb-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Diagnostic Modules</p>
          {moduleConfigs.map((mod) => {
            const Icon = iconMap[mod.icon] || Activity;
            return (
              <NavButton
                key={mod.id}
                active={view === mod.id}
                onClick={() => { setView(mod.id); setSidebarOpen(false); }}
                icon={Icon}
                label={mod.shortName}
                sublabel={mod.modality}
                accent={mod.accentColor}
              />
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-clinical-700/60">
          <div className="glass-panel p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-clinical-700 flex items-center justify-center">
              <Settings className="w-4 h-4 text-med-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300">Engine v2.4.1</p>
              <p className="text-[10px] text-slate-500">PyTorch · MONAI · OpenCV</p>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] text-success font-medium">Online</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 lg:px-8 py-4 border-b border-clinical-700/60 bg-clinical-900/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-clinical-800 text-slate-400"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-white">
                {view === 'analytics' ? 'Global Analytics Overview' : activeModule?.name}
              </h2>
              <p className="text-xs text-slate-500">
                {view === 'analytics'
                  ? 'Cross-module performance & clinical insights'
                  : activeModule?.modality}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-clinical-800/60 border border-clinical-700/40">
              <div className="w-2 h-2 rounded-full bg-med-400 animate-pulse" />
              <span className="text-xs text-slate-400 font-medium">Inference Ready</span>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Session</p>
              <p className="text-xs font-mono text-med-300">CLN-{new Date().getFullYear()}-{String(Math.floor(Math.random() * 9000) + 1000)}</p>
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {view === 'analytics' ? (
            <AnalyticsOverview onNavigate={setView} />
          ) : (
            activeModule && <DiagnosticWorkspace module={activeModule} />
          )}
        </div>
      </main>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon: Icon,
  label,
  sublabel,
  accent = 'med',
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Activity;
  label: string;
  sublabel: string;
  accent?: string;
}) {
  const accentBg: Record<string, string> = {
    med: 'from-med-500/20 to-med-600/5 text-med-300 border-med-500/30',
    electric: 'from-electric-500/20 to-electric-600/5 text-electric-400 border-electric-500/30',
    warning: 'from-warning/20 to-warning/5 text-warning border-warning/30',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
        active
          ? `bg-gradient-to-r ${accentBg[accent]} border`
          : 'hover:bg-clinical-800/60 text-slate-400'
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
        active ? 'bg-clinical-800' : 'bg-clinical-800/50 group-hover:bg-clinical-700'
      }`}>
        <Icon className="w-4 h-4" strokeWidth={2} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className={`text-sm font-medium ${active ? '' : 'text-slate-300'}`}>{label}</p>
        <p className="text-[10px] text-slate-500 truncate">{sublabel}</p>
      </div>
      {active && <ChevronRight className="w-4 h-4 opacity-50" />}
    </button>
  );
}
