import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload, Image as ImageIcon, Play, Loader2, Sun, Contrast, Sparkles,
  Layers, Sliders, Code2, BarChart3, FileText, RotateCcw,
  AlertCircle, CheckCircle2, Clock, Cpu, Zap, ChevronRight, History, Trash2,
} from 'lucide-react';
import type { ModuleConfig, ImageAdjustments, DiagnosisResult, AnalysisState } from '../types';
import { generateMedicalImage, generateHeatmap } from '../lib/imageGenerator';
import { applyAdjustments, loadImageToCanvas, blendHeatmap } from '../lib/imageProcessing';
import { callDiagnose, fetchAnalysesByModule, deleteAnalysis } from '../lib/api';
import type { AnalysisRow } from '../lib/supabase';
import CodeViewer from './CodeViewer';

export default function DiagnosticWorkspace({ module }: { module: ModuleConfig }) {
  const [selectedCaseIdx, setSelectedCaseIdx] = useState<number | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [, setCurrentVariant] = useState(0);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    brightness: 0,
    contrast: 0,
    sharpen: 0,
  });
  const [heatmapOpacity, setHeatmapOpacity] = useState(50);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: 'idle', progress: 0, stage: '' });
  const [activeTab, setActiveTab] = useState<'workspace' | 'code'>('workspace');
  const [, setHeatmapUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [history, setHistory] = useState<AnalysisRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [diagnoseError, setDiagnoseError] = useState<string | null>(null);

  const rawCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapImgRef = useRef<HTMLImageElement | null>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load image into source canvas
  const loadImage = useCallback(async (imageSrc: string, variant: number) => {
    const canvas = document.createElement('canvas');
    sourceCanvasRef.current = canvas;
    await loadImageToCanvas(imageSrc, canvas);
    setCurrentImage(imageSrc);
    setCurrentVariant(variant);
    setResult(null);
    setAnalysis({ status: 'idle', progress: 0, stage: '' });

    // Generate heatmap
    const hmUrl = generateHeatmap(module.id, variant);
    setHeatmapUrl(hmUrl);

    const hmImg = new Image();
    hmImg.onload = () => {
      heatmapImgRef.current = hmImg;
      renderCanvases();
    };
    hmImg.src = hmUrl;
  }, [module.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Select a sample case
  const selectCase = useCallback((idx: number) => {
    const variant = idx; // variant matches index
    const imageUrl = generateMedicalImage(module.id, variant);
    setUploadedImage(null);
    setSelectedCaseIdx(idx);
    loadImage(imageUrl, variant);
  }, [module.id, loadImage]);

  // Handle file upload
  const handleFile = useCallback((file: File) => {
    if (!file.type.match(/image\/(png|jpeg|jpg)/) && !file.name.endsWith('.dcm')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setUploadedImage(src);
      setSelectedCaseIdx(null);
      // For uploaded images, use a random variant for heatmap
      const variant = Math.floor(Math.random() * 3);
      loadImage(src, variant);
    };
    reader.readAsDataURL(file);
  }, [loadImage]);

  // Render canvases with adjustments
  const renderCanvases = useCallback(() => {
    const source = sourceCanvasRef.current;
    const rawCanvas = rawCanvasRef.current;
    const processedCanvas = processedCanvasRef.current;
    const heatmapCanvas = heatmapCanvasRef.current;
    if (!source || !rawCanvas || !processedCanvas || !heatmapCanvas) return;

    // Raw canvas: original image
    const rawCtx = rawCanvas.getContext('2d')!;
    rawCanvas.width = source.width;
    rawCanvas.height = source.height;
    rawCtx.drawImage(source, 0, 0);

    // Processed canvas: with adjustments
    applyAdjustments(source, processedCanvas, adjustments);

    // Heatmap canvas: blend
    if (heatmapImgRef.current) {
      blendHeatmap(processedCanvas, heatmapImgRef.current, heatmapCanvas, heatmapOpacity / 100);
    }
  }, [adjustments, heatmapOpacity]);

  // Re-render when adjustments or opacity change
  useEffect(() => {
    renderCanvases();
  }, [renderCanvases]);

  // Run diagnosis via edge function
  const runDiagnosis = useCallback(async () => {
    if (!currentImage) return;
    setDiagnoseError(null);
    setAnalysis({ status: 'analyzing', progress: 0, stage: 'Initializing model...' });

    const stages = [
      'Initializing model...',
      'Preprocessing image (MONAI transforms)...',
      'Forward pass through CNN backbone...',
      'Extracting feature maps...',
      'Computing Grad-CAM activations...',
      'Running segmentation U-Net...',
      'Aggregating class probabilities...',
      'Generating clinical report...',
    ];

    let stageIdx = 0;
    let progress = 0;
    const interval = setInterval(() => {
      progress += 12 + Math.random() * 8;
      stageIdx = Math.min(stages.length - 1, Math.floor(progress / (100 / stages.length)));
      setAnalysis({ status: 'analyzing', progress: Math.min(95, progress), stage: stages[stageIdx] });
    }, 200);

    try {
      const groundTruth = selectedCaseIdx !== null
        ? module.samples[selectedCaseIdx].groundTruth
        : module.classes[Math.floor(Math.random() * module.classes.length)];
      const difficulty = selectedCaseIdx !== null
        ? module.samples[selectedCaseIdx].difficulty
        : 'Routine';
      const caseId = selectedCaseIdx !== null
        ? module.samples[selectedCaseIdx].id
        : null;
      const caseLabel = selectedCaseIdx !== null
        ? module.samples[selectedCaseIdx].label
        : 'Custom Upload';

      const response = await callDiagnose({
        moduleId: module.id,
        caseId,
        caseLabel,
        groundTruth,
        classes: module.classes,
        difficulty,
        imageSource: selectedCaseIdx !== null ? 'sample' : 'upload',
      });

      clearInterval(interval);
      setResult(response.result);
      setAnalysis({ status: 'complete', progress: 100, stage: 'Complete' });
      loadHistory();
    } catch (err) {
      clearInterval(interval);
      const message = err instanceof Error ? err.message : 'Diagnosis failed';
      setDiagnoseError(message);
      setAnalysis({ status: 'idle', progress: 0, stage: '' });
    }
  }, [currentImage, selectedCaseIdx, module, loadHistory]);

  // Load analysis history from Supabase
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    const rows = await fetchAnalysesByModule(module.id, 10);
    setHistory(rows);
    setHistoryLoading(false);
  }, [module.id]);

  // Load history on mount and when module changes
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDeleteAnalysis = async (id: string) => {
    const success = await deleteAnalysis(id);
    if (success) {
      setHistory((prev) => prev.filter((h) => h.id !== id));
    }
  };

  const resetAdjustments = () => {
    setAdjustments({ brightness: 0, contrast: 0, sharpen: 0 });
    setHeatmapOpacity(50);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-fade-in">
      {/* Tab switcher */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('workspace')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'workspace'
              ? 'bg-med-500/15 text-med-300 border border-med-500/30'
              : 'text-slate-400 hover:bg-clinical-800/60 border border-transparent'
          }`}
        >
          <Sliders className="w-4 h-4" /> Diagnostic Workspace
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'code'
              ? 'bg-med-500/15 text-med-300 border border-med-500/30'
              : 'text-slate-400 hover:bg-clinical-800/60 border border-transparent'
          }`}
        >
          <Code2 className="w-4 h-4" /> Model Architecture
        </button>
      </div>

      {activeTab === 'workspace' ? (
        <>
          {/* Case selection + upload */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Sample gallery */}
            <div className="glass-panel p-4 lg:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="w-4 h-4 text-med-400" />
                <h3 className="text-sm font-semibold text-white">Sample Clinical Cases</h3>
                <span className="text-xs text-slate-500">· {module.samples.length} cases available</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {module.samples.map((sample, idx) => (
                  <button
                    key={sample.id}
                    onClick={() => selectCase(idx)}
                    className={`p-3 rounded-lg border text-left transition-all group ${
                      selectedCaseIdx === idx
                        ? 'bg-med-500/10 border-med-500/40 med-glow'
                        : 'bg-clinical-800/40 border-clinical-700/40 hover:border-clinical-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-slate-500">{sample.id}</span>
                      <DifficultyBadge difficulty={sample.difficulty} />
                    </div>
                    <p className="text-sm font-medium text-slate-200 mb-1">{sample.label}</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{sample.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Upload */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`glass-panel p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging ? 'border-med-500/60 bg-med-500/5' : 'hover:border-med-500/30'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-clinical-800 flex items-center justify-center mb-3">
                <Upload className="w-5 h-5 text-med-400" />
              </div>
              <p className="text-sm font-medium text-slate-300 mb-1">Drag & Drop Image</p>
              <p className="text-xs text-slate-500 mb-2">or click to browse</p>
              <p className="text-[10px] text-slate-600 font-mono">.png · .jpg · .jpeg · .dcm</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,.dcm"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              {uploadedImage && (
                <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20">
                  <CheckCircle2 className="w-3 h-3 text-success" />
                  <span className="text-xs text-success">Custom image loaded</span>
                </div>
              )}
            </div>
          </div>

          {/* Image viewers */}
          {currentImage ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Raw input viewer */}
              <div className="glass-panel overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-clinical-700/60">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-med-400" />
                    <h3 className="text-sm font-semibold text-white">Raw Input</h3>
                    <span className="text-xs text-slate-500">· {module.modality}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-600">512×512 · 16-bit</span>
                </div>
                <div className="relative bg-black flex items-center justify-center p-4 min-h-[280px]">
                  <canvas ref={rawCanvasRef} className="max-w-full max-h-[320px] rounded-lg" />
                  {analysis.status === 'analyzing' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute inset-x-0 h-1 scanline animate-scan" />
                      </div>
                    </div>
                  )}
                </div>
                {/* Windowing controls */}
                <div className="p-4 space-y-3 border-t border-clinical-700/60">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                      <Sliders className="w-3 h-3" /> OpenCV Windowing
                    </span>
                    <button
                      onClick={resetAdjustments}
                      className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-med-300 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  </div>
                  <AdjustmentSlider
                    icon={Sun}
                    label="Brightness"
                    value={adjustments.brightness}
                    onChange={(v) => setAdjustments((a) => ({ ...a, brightness: v }))}
                    min={-100}
                    max={100}
                  />
                  <AdjustmentSlider
                    icon={Contrast}
                    label="Contrast"
                    value={adjustments.contrast}
                    onChange={(v) => setAdjustments((a) => ({ ...a, contrast: v }))}
                    min={-100}
                    max={100}
                  />
                  <AdjustmentSlider
                    icon={Sparkles}
                    label="Sharpen"
                    value={adjustments.sharpen}
                    onChange={(v) => setAdjustments((a) => ({ ...a, sharpen: v }))}
                    min={0}
                    max={100}
                  />
                </div>
              </div>

              {/* Grad-CAM viewer */}
              <div className="glass-panel overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-clinical-700/60">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-danger" />
                    <h3 className="text-sm font-semibold text-white">Grad-CAM Explainability</h3>
                    <span className="text-xs text-slate-500">· Attention Map</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-600">Jet Colormap</span>
                </div>
                <div className="relative bg-black flex items-center justify-center p-4 min-h-[280px]">
                  <canvas ref={heatmapCanvasRef} className="max-w-full max-h-[320px] rounded-lg" />
                  {analysis.status === 'analyzing' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 text-med-400 animate-spin mx-auto mb-2" />
                        <p className="text-xs text-med-300 font-mono">{analysis.stage}</p>
                      </div>
                    </div>
                  )}
                </div>
                {/* Opacity control */}
                <div className="p-4 space-y-3 border-t border-clinical-700/60">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                      <Layers className="w-3 h-3" /> Heatmap Opacity
                    </span>
                    <span className="text-xs font-mono text-med-300">{heatmapOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={heatmapOpacity}
                    onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                    className="w-full"
                  />
                  {/* Color scale legend */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">Low</span>
                    <div className="flex-1 h-2 rounded-full" style={{
                      background: 'linear-gradient(to right, #0000c8, #00c8c8, #ffff00, #ffa500, #ff0000)'
                    }} />
                    <span className="text-[10px] text-slate-500">High</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-clinical-800 flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-sm font-medium text-slate-400 mb-1">No image loaded</p>
              <p className="text-xs text-slate-600">Select a sample case above or upload an image to begin analysis</p>
            </div>
          )}

          {/* Analyze button */}
          {currentImage && (
            <div className="flex items-center gap-3">
              <button
                onClick={runDiagnosis}
                disabled={analysis.status === 'analyzing'}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-med-500 to-electric-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-med-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analysis.status === 'analyzing' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {analysis.status === 'analyzing' ? 'Analyzing...' : 'Run AI Diagnosis'}
              </button>
              {analysis.status === 'analyzing' && (
                <div className="flex-1 max-w-xs">
                  <div className="h-1.5 rounded-full bg-clinical-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-med-400 to-electric-500 rounded-full transition-all duration-200"
                      style={{ width: `${analysis.progress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">{analysis.stage}</p>
                </div>
              )}
            </div>
          )}

          {/* Error display */}
          {diagnoseError && (
            <div className="glass-panel p-4 border-danger/30 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-danger">Diagnosis Error</p>
                <p className="text-xs text-slate-400">{diagnoseError}</p>
              </div>
            </div>
          )}

          {/* Results panel */}
          {result && analysis.status === 'complete' && (
            <ResultsPanel result={result} module={module} />
          )}

          {/* Analysis history */}
          <AnalysisHistory
            history={history}
            loading={historyLoading}
            onDelete={handleDeleteAnalysis}
          />
        </>
      ) : (
        /* Code / Architecture tab */
        <div className="space-y-4">
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-med-400" />
              <h3 className="text-sm font-semibold text-white">Model Architecture</h3>
              <span className="text-xs text-slate-500">· PyTorch / MONAI implementation</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              The {module.shortName} module uses a {module.id === 'xray' ? 'DenseNet-121' : module.id === 'mri' ? 'ResNet-50' : 'EfficientNet-B4'} backbone
              {' '}fine-tuned on public datasets ({module.id === 'xray' ? 'RSNA Pneumonia' : module.id === 'mri' ? 'BraTS' : 'ISIC 2019'}).
              {' '}The model is trained with mixed precision and uses MONAI transforms for medical image preprocessing.
            </p>
          </div>
          <CodeViewer blocks={module.modelArchitecture} />
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-danger" />
              <h3 className="text-sm font-semibold text-white">Grad-CAM Explainability Script</h3>
              <span className="text-xs text-slate-500">· Gradient-weighted Class Activation Mapping</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Grad-CAM captures gradients flowing into the final convolutional layer to produce a coarse localization map
              highlighting regions the CNN focused on for its prediction. This enables clinical interpretability of model decisions.
            </p>
          </div>
          <CodeViewer blocks={module.gradCamScript} />
        </div>
      )}
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    Routine: 'text-success bg-success/10 border-success/20',
    Borderline: 'text-warning bg-warning/10 border-warning/20',
    Complex: 'text-danger bg-danger/10 border-danger/20',
  };
  return (
    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${colors[difficulty] || colors.Routine}`}>
      {difficulty}
    </span>
  );
}

function AdjustmentSlider({
  icon: Icon,
  label,
  value,
  onChange,
  min,
  max,
}: {
  icon: typeof Sun;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400 flex items-center gap-1.5">
          <Icon className="w-3 h-3" /> {label}
        </span>
        <span className="text-xs font-mono text-med-300">{value > 0 ? '+' : ''}{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

function ResultsPanel({ result, module }: { result: DiagnosisResult; module: ModuleConfig }) {
  const isPositive = result.primaryClass !== 'Normal' && result.primaryClass !== 'No Tumor' && result.primaryClass !== 'Melanocytic Nevus' && result.primaryClass !== 'Benign Keratosis' && result.primaryClass !== 'Vascular Lesion';

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Primary diagnosis */}
      <div className={`glass-panel p-5 ${isPositive ? 'border-danger/30' : 'border-success/30'}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPositive ? 'bg-danger/10' : 'bg-success/10'}`}>
              {isPositive ? <AlertCircle className="w-5 h-5 text-danger" /> : <CheckCircle2 className="w-5 h-5 text-success" />}
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Primary Diagnosis</p>
              <h3 className="text-lg font-bold text-white">{result.primaryClass}</h3>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Confidence</p>
            <p className={`text-2xl font-bold ${isPositive ? 'text-danger' : 'text-success'}`}>
              {(result.confidence * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Confidence meter */}
        <div className="mb-4">
          <div className="h-3 rounded-full bg-clinical-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                isPositive ? 'bg-gradient-to-r from-warning to-danger' : 'bg-gradient-to-r from-med-400 to-success'
              }`}
              style={{ width: `${result.confidence * 100}%` }}
            />
          </div>
        </div>

        {/* Class probabilities */}
        <div className="space-y-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Class Probability Distribution</p>
          {result.classProbabilities.map((prob) => (
            <div key={prob.label} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-32 truncate">{prob.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-clinical-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${prob.label === result.primaryClass ? 'bg-med-400' : 'bg-clinical-600'}`}
                  style={{ width: `${prob.probability * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-slate-300 w-12 text-right">{(prob.probability * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>

        {/* Inference meta */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-clinical-700/60">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="w-3 h-3" /> {result.inferenceTimeMs}ms inference
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Cpu className="w-3 h-3" /> {module.id === 'xray' ? 'DenseNet-121' : module.id === 'mri' ? 'ResNet-50' : 'EfficientNet-B4'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Zap className="w-3 h-3" /> FP16 mixed precision
          </div>
        </div>
      </div>

      {/* Metrics + Explainability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* MONAI metrics */}
        <div className="glass-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-med-400" />
            <h3 className="text-sm font-semibold text-white">MONAI Clinical Metrics</h3>
          </div>
          <div className="space-y-3">
            {result.metrics.map((metric, i) => (
              <div key={i} className="flex items-start justify-between p-3 rounded-lg bg-clinical-800/40 border border-clinical-700/40">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-300">{metric.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{metric.detail}</p>
                </div>
                <span className="text-sm font-mono font-bold text-med-300 ml-3">{metric.value}</span>
              </div>
            ))}
          </div>

          {/* Heatmap regions */}
          <div className="mt-4 pt-4 border-t border-clinical-700/60">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-3">Activation Regions</p>
            <div className="space-y-2">
              {result.heatmapRegions.map((region, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300">{region.region}</p>
                    <p className="text-[10px] text-slate-500">{region.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-clinical-800 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${region.intensity * 100}%`,
                          background: region.intensity > 0.7 ? '#ef4444' : region.intensity > 0.4 ? '#f59e0b' : '#22d3ee',
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 w-8 text-right">{(region.intensity * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Explainability report */}
        <div className="glass-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-electric-400" />
            <h3 className="text-sm font-semibold text-white">Explainability Report</h3>
          </div>
          <div className="space-y-3">
            {result.explainability.map((text, i) => (
              <div key={i} className="flex items-start gap-2">
                <ChevronRight className="w-3 h-3 text-med-400 mt-1 flex-shrink-0" />
                <p className="text-xs text-slate-400 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-clinical-700/60">
            <div className="flex items-center gap-2 text-[10px] text-slate-600">
              <AlertCircle className="w-3 h-3" />
              <span>This is a simulated analysis for demonstration purposes. Not for clinical use.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisHistory({
  history,
  loading,
  onDelete,
}: {
  history: AnalysisRow[];
  loading: boolean;
  onDelete: (id: string) => void;
}) {
  if (loading && history.length === 0) {
    return (
      <div className="glass-panel p-5">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-med-400" />
          <h3 className="text-sm font-semibold text-white">Analysis History</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="glass-panel p-5">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-med-400" />
          <h3 className="text-sm font-semibold text-white">Analysis History</h3>
        </div>
        <p className="text-xs text-slate-500 text-center py-6">No analyses yet. Run a diagnosis to see it here.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-med-400" />
          <h3 className="text-sm font-semibold text-white">Analysis History</h3>
          <span className="text-xs text-slate-500">· {history.length} records</span>
        </div>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {history.map((row) => {
          const isPositive = row.predicted_class !== 'Normal' && row.predicted_class !== 'No Tumor' && row.predicted_class !== 'Melanocytic Nevus' && row.predicted_class !== 'Benign Keratosis' && row.predicted_class !== 'Vascular Lesion';
          return (
            <div key={row.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-clinical-800/40 border border-clinical-700/40 hover:bg-clinical-800/60 transition-colors group">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isPositive ? 'bg-danger' : 'bg-success'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-200 truncate">{row.predicted_class}</span>
                  <span className="text-xs font-mono text-med-300">{(row.confidence * 100).toFixed(1)}%</span>
                </div>
                <p className="text-[10px] text-slate-500 truncate">
                  {row.case_label || 'Custom Upload'} · {row.image_source} · {row.inference_time_ms}ms
                </p>
              </div>
              <span className="text-[10px] text-slate-600 hidden sm:inline flex-shrink-0">
                {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                onClick={() => onDelete(row.id)}
                className="p-1 rounded text-slate-600 hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
