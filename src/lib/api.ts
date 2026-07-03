import type { DiagnosisResult, ModuleId } from '../types';
import { supabase, type AnalysisRow } from './supabase';

export interface DiagnoseRequest {
  moduleId: ModuleId;
  caseId: string | null;
  caseLabel: string | null;
  groundTruth: string;
  classes: string[];
  difficulty: string;
  imageSource: 'sample' | 'upload';
}

export interface DiagnoseResponse {
  result: DiagnosisResult;
  analysisId: string;
  savedAt: string;
}

export async function callDiagnose(req: DiagnoseRequest): Promise<DiagnoseResponse> {
  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/diagnose`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Use the anon key from the supabase client for auth
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (anonKey) {
    headers['Authorization'] = `Bearer ${anonKey}`;
    headers['apikey'] = anonKey;
  }

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: `Request failed (${response.status})` }));
    throw new Error(errorBody.error || `Diagnosis request failed (${response.status})`);
  }

  const data = await response.json();
  if (!data.result || !data.analysisId) {
    throw new Error('Invalid response from diagnosis endpoint');
  }

  return data as DiagnoseResponse;
}

export async function fetchRecentAnalyses(limit = 20): Promise<AnalysisRow[]> {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch analyses:', error);
    return [];
  }

  return (data || []) as AnalysisRow[];
}

export async function fetchAnalysesByModule(moduleId: ModuleId, limit = 20): Promise<AnalysisRow[]> {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('module_id', moduleId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch module analyses:', error);
    return [];
  }

  return (data || []) as AnalysisRow[];
}

export async function fetchAnalyticsStats(): Promise<{
  totalCases: number;
  moduleCounts: Record<string, number>;
  avgConfidence: number;
  recentAnalyses: AnalysisRow[];
}> {
  const { count, error: countError } = await supabase
    .from('analyses')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Failed to fetch count:', countError);
  }

  const { data: recent, error: recentError } = await supabase
    .from('analyses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (recentError) {
    console.error('Failed to fetch recent analyses:', recentError);
  }

  const recentData = (recent || []) as AnalysisRow[];
  const moduleCounts: Record<string, number> = { xray: 0, mri: 0, derm: 0 };
  let confidenceSum = 0;

  for (const row of recentData) {
    moduleCounts[row.module_id] = (moduleCounts[row.module_id] || 0) + 1;
    confidenceSum += row.confidence;
  }

  return {
    totalCases: count || 0,
    moduleCounts,
    avgConfidence: recentData.length > 0 ? confidenceSum / recentData.length : 0,
    recentAnalyses: recentData,
  };
}

export async function deleteAnalysis(id: string): Promise<boolean> {
  const { error } = await supabase.from('analyses').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete analysis:', error);
    return false;
  }
  return true;
}
