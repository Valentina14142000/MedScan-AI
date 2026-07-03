import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

// Database row types
export interface AnalysisRow {
  id: string;
  module_id: string;
  case_id: string | null;
  case_label: string | null;
  image_source: 'sample' | 'upload';
  predicted_class: string;
  confidence: number;
  class_probabilities: { label: string; probability: number }[];
  metrics: { label: string; value: string; detail: string }[];
  explainability: string[];
  heatmap_regions: { region: string; intensity: number; description: string }[];
  inference_time_ms: number;
  created_at: string;
}

export interface DiagnosticModuleRow {
  id: string;
  name: string;
  modality: string;
  icon: string;
  classes: string[];
}
