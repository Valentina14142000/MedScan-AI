import type { ModuleId } from '../types';

export interface ModuleInfo {
  id: ModuleId;
  name: string;
  sub: string;
  desc: string;
  care: string;
}

export const MODULES: ModuleInfo[] = [
  { id: 'xray', name: 'Chest X-ray', sub: 'Radiograph review', desc: 'a chest X-ray (radiograph)', care: 'Seek urgent care for trouble breathing, chest pain, or coughing blood.' },
  { id: 'mri', name: 'Brain MRI', sub: 'Single-slice review', desc: 'a brain MRI slice', care: 'Seek urgent care for sudden severe headache, weakness, confusion, or trouble speaking.' },
  { id: 'skin', name: 'Dermatology', sub: 'Skin close-up review', desc: 'a close-up photo of skin', care: 'Have changing, bleeding, or fast-growing skin spots checked by a clinician soon.' },
];

export const moduleById = (id: ModuleId): ModuleInfo => MODULES.find((m) => m.id === id) ?? MODULES[0];
