/*
# Create diagnostic analyses schema

1. Purpose
   This is a single-tenant clinical demonstration app with no sign-in screen.
   All data is intentionally shared/public so the anon-key frontend can read
   and write freely. We persist diagnostic analysis records so users can
   review their analysis history and the analytics dashboard can show real
   aggregate data.

2. New Tables
   - `diagnostic_modules`: lookup table for the three diagnostic modules
     (xray, mri, derm). Seeded with one row per module.
   - `analyses`: stores each diagnostic analysis run — which module, which
     case/image, the predicted class, confidence, metrics, explainability
     text, inference time, and timestamps.

3. Columns (analyses)
   - id (uuid, PK)
   - module_id (text, not null) — 'xray' | 'mri' | 'derm'
   - case_id (text, nullable) — sample case identifier or null for uploads
   - case_label (text, nullable) — human-readable case name
   - image_source (text, not null) — 'sample' | 'upload'
   - predicted_class (text, not null) — the primary diagnosis
   - confidence (real, not null) — 0.0 to 1.0
   - class_probabilities (jsonb, not null) — full class probability distribution
   - metrics (jsonb, not null) — MONAI clinical metrics array
   - explainability (jsonb, not null) — explainability report paragraphs
   - heatmap_regions (jsonb, not null) — activation region breakdown
   - inference_time_ms (integer, not null)
   - created_at (timestamptz, default now())

4. Security
   - RLS enabled on both tables.
   - Policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
     because this is a single-tenant no-auth app where all data is intentionally
     public/shared. This is the documented exception, not a shortcut.

5. Notes
   - No user_id column or auth.users FK — this app has no sign-in.
   - Indexes on module_id and created_at for dashboard query performance.
*/

-- Diagnostic modules lookup table
CREATE TABLE IF NOT EXISTS diagnostic_modules (
  id text PRIMARY KEY,
  name text NOT NULL,
  modality text NOT NULL,
  icon text NOT NULL,
  classes jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- Analyses table
CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id text NOT NULL REFERENCES diagnostic_modules(id) ON DELETE CASCADE,
  case_id text,
  case_label text,
  image_source text NOT NULL DEFAULT 'sample' CHECK (image_source IN ('sample', 'upload')),
  predicted_class text NOT NULL,
  confidence real NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  class_probabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics jsonb NOT NULL DEFAULT '[]'::jsonb,
  explainability jsonb NOT NULL DEFAULT '[]'::jsonb,
  heatmap_regions jsonb NOT NULL DEFAULT '[]'::jsonb,
  inference_time_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_analyses_module_id ON analyses(module_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);

-- Enable RLS
ALTER TABLE diagnostic_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Policies for diagnostic_modules (read-only lookup, public)
DROP POLICY IF EXISTS "anon_select_modules" ON diagnostic_modules;
CREATE POLICY "anon_select_modules" ON diagnostic_modules FOR SELECT
  TO anon, authenticated USING (true);

-- Policies for analyses (full CRUD, public — single-tenant no-auth app)
DROP POLICY IF EXISTS "anon_select_analyses" ON analyses;
CREATE POLICY "anon_select_analyses" ON analyses FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_analyses" ON analyses;
CREATE POLICY "anon_insert_analyses" ON analyses FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_analyses" ON analyses;
CREATE POLICY "anon_update_analyses" ON analyses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_analyses" ON analyses;
CREATE POLICY "anon_delete_analyses" ON analyses FOR DELETE
  TO anon, authenticated USING (true);

-- Seed the three diagnostic modules
INSERT INTO diagnostic_modules (id, name, modality, icon, classes) VALUES
  ('xray', 'Chest X-Ray Analysis', 'Chest Radiograph (PA/AP)', 'Stethoscope',
   '["Normal","Pneumonia"]'::jsonb),
  ('mri', 'Brain MRI Classification', 'T1-weighted Axial MRI', 'Brain',
   '["Glioma","Meningioma","Pituitary","No Tumor"]'::jsonb),
  ('derm', 'Dermatoscopic Skin Analysis', 'Polarized Dermoscopy', 'Microscope',
   '["Melanocytic Nevus","Melanoma","Basal Cell Carcinoma","Benign Keratosis","Vascular Lesion"]'::jsonb)
ON CONFLICT (id) DO NOTHING;
