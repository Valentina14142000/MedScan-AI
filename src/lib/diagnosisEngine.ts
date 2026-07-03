import type { ModuleId, DiagnosisResult } from '../types';

// Deterministic pseudo-random based on string seed
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

function generateProbabilities(
  classes: string[],
  predictedIndex: number,
  seed: string,
  confidence: number
): { label: string; probability: number }[] {
  const probs = classes.map((label, i) => {
    if (i === predictedIndex) return { label, probability: confidence };
    const r = seededRandom(seed + label);
    return { label, probability: r * (1 - confidence) };
  });

  // Normalize
  const sum = probs.reduce((s, p) => s + p.probability, 0);
  return probs
    .map((p) => ({ label: p.label, probability: p.probability / sum }))
    .sort((a, b) => b.probability - a.probability);
}

export function simulateDiagnosis(
  moduleId: ModuleId,
  caseId: string,
  groundTruth: string,
  classes: string[],
  difficulty: string
): DiagnosisResult {
  const seed = caseId;
  const predictedIndex = classes.indexOf(groundTruth);
  const isBorderline = difficulty === 'Borderline';

  // Confidence depends on difficulty
  let confidence: number;
  if (difficulty === 'Routine') {
    confidence = 0.88 + seededRandom(seed + 'conf') * 0.10; // 88-98%
  } else if (difficulty === 'Borderline') {
    confidence = 0.62 + seededRandom(seed + 'conf') * 0.15; // 62-77%
  } else {
    confidence = 0.75 + seededRandom(seed + 'conf') * 0.18; // 75-93%
  }

  const classProbabilities = generateProbabilities(classes, predictedIndex, seed, confidence);
  const inferenceTime = 45 + Math.floor(seededRandom(seed + 'time') * 80);

  if (moduleId === 'xray') {
    return simulateXray(seed, groundTruth, confidence, classProbabilities, inferenceTime, isBorderline);
  } else if (moduleId === 'mri') {
    return simulateMRI(seed, groundTruth, confidence, classProbabilities, inferenceTime);
  } else {
    return simulateDerm(seed, groundTruth, confidence, classProbabilities, inferenceTime);
  }
}

function simulateXray(
  seed: string,
  groundTruth: string,
  confidence: number,
  classProbabilities: { label: string; probability: number }[],
  inferenceTime: number,
  isBorderline: boolean
): DiagnosisResult {
  const isPneumonia = groundTruth === 'Pneumonia';
  const r = seededRandom(seed + 'metric');

  const metrics = isPneumonia
    ? [
        { label: 'Consolidation Area', value: `${(8.2 + r * 12).toFixed(1)} cm²`, detail: 'Estimated from activation bounding region' },
        { label: 'Opacity Score', value: `${(0.65 + r * 0.3).toFixed(2)}`, detail: 'Normalized lung opacity index (0-1)' },
        { label: 'Affected Lobes', value: isBorderline ? '2' : '1', detail: 'Count of lobes with significant activation' },
        { label: 'Dice Coefficient', value: `${(0.82 + r * 0.12).toFixed(3)}`, detail: 'Segmentation overlap (model vs. ground truth mask)' },
      ]
    : [
        { label: 'Lung Field Clarity', value: 'High', detail: 'No significant opacity detected in bilateral fields' },
        { label: 'Cardiothoracic Ratio', value: `${(0.42 + r * 0.06).toFixed(2)}`, detail: 'Normal range: 0.40-0.50' },
        { label: 'Opacity Score', value: `${(0.05 + r * 0.08).toFixed(2)}`, detail: 'Normalized lung opacity index (0-1)' },
        { label: 'Dice Coefficient', value: `${(0.94 + r * 0.04).toFixed(3)}`, detail: 'Segmentation overlap (model vs. ground truth mask)' },
      ];

  const explainability = isPneumonia
    ? [
        `Grad-CAM localized high-intensity activations in the ${isBorderline ? 'bilateral lower lung fields' : 'right lower lung lobe'}, matching typical patterns of ${isBorderline ? 'multifocal' : 'lobar'} consolidation.`,
        'Secondary activations observed along the major fissure, consistent with fluid accumulation and air bronchogram patterns.',
        `The model's attention aligns with radiopaque regions exhibiting texture gradients characteristic of alveolar infiltrate, achieving ${confidence >= 0.9 ? 'high' : 'moderate'} spatial correspondence with the pathological region.`,
        'Low activation in the upper lobes and costophrenic angles suggests preserved aeration in unaffected segments.',
      ]
    : [
        'Grad-CAM shows diffuse, low-intensity activation across both lung fields with no focal concentration, consistent with normal pulmonary aeration.',
        'No significant activation gradients detected in the hilar, perihilar, or peripheral lung zones.',
        'The model attended to the cardiac silhouette and diaphragm contours as expected reference landmarks, confirming normal anatomical presentation.',
        'Absence of pathological activation patterns supports the negative pneumonia classification with high spatial confidence.',
      ];

  const heatmapRegions = isPneumonia
    ? [
        { region: 'Right Lower Lobe', intensity: 0.92, description: 'Primary consolidation focus with air bronchograms' },
        { region: 'Major Fissure', intensity: 0.68, description: 'Secondary fluid accumulation along pleural boundary' },
        { region: 'Costophrenic Angle', intensity: 0.35, description: 'Mild reactive change, possible early effusion' },
      ]
    : [
        { region: 'Bilateral Lung Fields', intensity: 0.28, description: 'Diffuse low activation — normal aeration pattern' },
        { region: 'Cardiac Silhouette', intensity: 0.22, description: 'Reference landmark attention' },
        { region: 'Diaphragm', intensity: 0.18, description: 'Reference landmark attention' },
      ];

  return {
    primaryClass: groundTruth,
    confidence,
    classProbabilities,
    metrics,
    explainability,
    heatmapRegions,
    inferenceTimeMs: inferenceTime,
  };
}

function simulateMRI(
  seed: string,
  groundTruth: string,
  confidence: number,
  classProbabilities: { label: string; probability: number }[],
  inferenceTime: number
): DiagnosisResult {
  const hasTumor = groundTruth !== 'No Tumor';
  const r = seededRandom(seed + 'metric');

  const metrics = hasTumor
    ? [
        { label: 'Tumor Volume', value: `${(12.5 + r * 35).toFixed(1)} cm³`, detail: 'Estimated from 3D segmentation reconstruction' },
        { label: 'Max Diameter', value: `${(2.1 + r * 3.8).toFixed(1)} cm`, detail: 'Maximum cross-sectional diameter' },
        { label: 'Dice Coefficient', value: `${(0.78 + r * 0.15).toFixed(3)}`, detail: 'Segmentation overlap (U-Net vs. radiologist annotation)' },
        { label: 'Mass Effect', value: groundTruth === 'Glioma' ? 'Moderate' : 'Minimal', detail: 'Degree of midline shift / ventricular compression' },
      ]
    : [
        { label: 'Ventricle Symmetry', value: 'Symmetric', detail: 'No mass effect or ventricular displacement detected' },
        { label: 'Parenchymal Volume', value: 'Normal', detail: 'Within expected range for patient age' },
        { label: 'Dice Coefficient', value: `${(0.96 + r * 0.03).toFixed(3)}`, detail: 'Segmentation overlap (U-Net vs. radiologist annotation)' },
        { label: 'Anomaly Score', value: `${(0.03 + r * 0.05).toFixed(3)}`, detail: 'Low anomaly — no mass detected' },
      ];

  const explainability = hasTumor
    ? [
        `Grad-CAM++ produced sharp, high-intensity activations centered on the ${groundTruth === 'Glioma' ? 'right temporal lobe mass with irregular margins' : 'left frontal convexity with well-defined borders'}, consistent with ${groundTruth} morphology.`,
        groundTruth === 'Glioma'
          ? 'A secondary activation halo surrounds the core mass, corresponding to peritumoral vasogenic edema visible on T1-weighted contrast.'
          : 'Activation is tightly bounded within the extra-axial compartment, consistent with a dural-based lesion.',
        `The attention map shows ${confidence >= 0.85 ? 'minimal' : 'moderate'} spillover into adjacent white matter tracts, reflecting ${confidence >= 0.85 ? 'well-defined' : 'partially defined'} tumor margins.`,
        'Ventricular and callosal regions show low activation, suggesting no significant infiltrative spread at the slice level.',
      ]
    : [
        'Grad-CAM++ shows uniform, low-magnitude activation across the brain parenchyma with no focal concentration.',
        'Ventricles, corpus callosum, and cortical ribbon show expected baseline activation patterns without mass effect.',
        'No activation clusters exceed the pathological threshold in any brain region.',
        'The spatial distribution of attention confirms normal brain architecture without evidence of neoplastic, inflammatory, or vascular pathology.',
      ];

  const heatmapRegions = hasTumor
    ? [
        { region: groundTruth === 'Glioma' ? 'Right Temporal Lobe' : 'Left Frontal Convexity', intensity: 0.94, description: `Primary ${groundTruth} mass localization` },
        { region: 'Peritumoral Region', intensity: groundTruth === 'Glioma' ? 0.71 : 0.42, description: 'Surrounding edema / dural tail' },
        { region: 'Adjacent White Matter', intensity: 0.38, description: 'Possible infiltration border' },
      ]
    : [
        { region: 'Bilateral Cortex', intensity: 0.25, description: 'Normal diffuse activation' },
        { region: 'Lateral Ventricles', intensity: 0.20, description: 'Reference anatomical landmark' },
        { region: 'Corpus Callosum', intensity: 0.15, description: 'Reference midline structure' },
      ];

  return {
    primaryClass: groundTruth,
    confidence,
    classProbabilities,
    metrics,
    explainability,
    heatmapRegions,
    inferenceTimeMs: inferenceTime,
  };
}

function simulateDerm(
  seed: string,
  groundTruth: string,
  confidence: number,
  classProbabilities: { label: string; probability: number }[],
  inferenceTime: number
): DiagnosisResult {
  const isMalignant = groundTruth === 'Melanoma' || groundTruth === 'Basal Cell Carcinoma';
  const r = seededRandom(seed + 'metric');

  const metrics = isMalignant
    ? [
        { label: 'ABCDE Score', value: groundTruth === 'Melanoma' ? `${(7.2 + r * 1.5).toFixed(1)}/10` : `${(5.8 + r * 1.2).toFixed(1)}/10`, detail: 'Asymmetry, Border, Color, Diameter, Evolution' },
        { label: 'Lesion Diameter', value: `${(6.5 + r * 8).toFixed(1)} mm`, detail: 'Maximum lesion diameter from segmentation' },
        { label: 'Color Variegation', value: `${(0.45 + r * 0.3).toFixed(2)}`, detail: 'Standard deviation of intra-lesional color channels' },
        { label: 'Border Irregularity', value: groundTruth === 'Melanoma' ? 'High' : 'Moderate', detail: 'Compactness ratio from contour analysis' },
      ]
    : [
        { label: 'ABCDE Score', value: `${(1.5 + r * 1.0).toFixed(1)}/10`, detail: 'Asymmetry, Border, Color, Diameter, Evolution' },
        { label: 'Lesion Diameter', value: `${(3.0 + r * 3).toFixed(1)} mm`, detail: 'Maximum lesion diameter from segmentation' },
        { label: 'Color Variegation', value: `${(0.08 + r * 0.06).toFixed(2)}`, detail: 'Standard deviation of intra-lesional color channels' },
        { label: 'Border Irregularity', value: 'Low', detail: 'Compactness ratio from contour analysis' },
      ];

  const explainability = isMalignant
    ? [
        groundTruth === 'Melanoma'
          ? 'Grad-CAM concentrated high-intensity activations on the asymmetric, irregular border of the pigmented lesion, with focal hotspots corresponding to areas of dark brown/black color variegation.'
          : 'Grad-CAM highlighted the pearly, translucent central region of the lesion with arborizing vessel patterns, consistent with basal cell carcinoma morphology.',
        `The model attended to ${groundTruth === 'Melanoma' ? 'the peripheral margin and color transition zones' : 'telangiectatic vessel networks'}, which are key dermoscopic features for ${groundTruth}.`,
        `Secondary activations were observed in the ${groundTruth === 'Melanoma' ? 'regression-like areas with blue-white veil structures' : 'peripheral rolling border'}, supporting the malignancy classification.`,
        `Color variegation and border irregularity metrics from the ABCDE analysis corroborate the CNN's attention pattern, yielding a combined risk score of ${(7.5 + r * 1.5).toFixed(1)}/10.`,
      ]
    : [
        'Grad-CAM shows uniform, moderate-intensity activation centered on the lesion body with symmetric distribution, consistent with a benign melanocytic nevus.',
        'No focal hotspots detected at the lesion border or in color transition zones, supporting the benign classification.',
        'The model attended to the regular pigment network pattern without irregular streaks or blue-white veil structures.',
        'Low ABCDE score and symmetric activation pattern strongly support the benign nevus diagnosis.',
      ];

  const heatmapRegions = isMalignant
    ? [
        { region: 'Lesion Border (Irregular)', intensity: 0.93, description: 'Primary malignancy indicator — irregular margin' },
        { region: 'Color Variegation Zone', intensity: 0.78, description: 'Dark pigmentation / blue-white veil' },
        { region: 'Central Regression Area', intensity: 0.55, description: 'Secondary feature — regression / inflammation' },
      ]
    : [
        { region: 'Lesion Center', intensity: 0.45, description: 'Uniform pigmentation — benign pattern' },
        { region: 'Regular Border', intensity: 0.30, description: 'Symmetric margin activation' },
        { region: 'Pigment Network', intensity: 0.25, description: 'Regular network pattern' },
      ];

  return {
    primaryClass: groundTruth,
    confidence,
    classProbabilities,
    metrics,
    explainability,
    heatmapRegions,
    inferenceTimeMs: inferenceTime,
  };
}
