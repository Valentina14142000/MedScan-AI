export type ModuleId = 'xray' | 'mri' | 'derm';

export interface SampleCase {
  id: string;
  label: string;
  description: string;
  imageUrl: string;
  groundTruth: string;
  difficulty: 'Routine' | 'Borderline' | 'Complex';
}

export interface DiagnosisResult {
  primaryClass: string;
  confidence: number;
  classProbabilities: { label: string; probability: number }[];
  metrics: {
    label: string;
    value: string;
    detail: string;
  }[];
  explainability: string[];
  heatmapRegions: {
    region: string;
    intensity: number;
    description: string;
  }[];
  inferenceTimeMs: number;
}

export interface ModuleConfig {
  id: ModuleId;
  name: string;
  shortName: string;
  modality: string;
  icon: string;
  accentColor: string;
  classes: string[];
  samples: SampleCase[];
  modelArchitecture: CodeBlock[];
  gradCamScript: CodeBlock[];
  defaultResult: DiagnosisResult;
}

export interface CodeBlock {
  filename: string;
  language: string;
  code: string;
}

export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  sharpen: number;
}

export interface AnalysisState {
  status: 'idle' | 'analyzing' | 'complete';
  progress: number;
  stage: string;
}
