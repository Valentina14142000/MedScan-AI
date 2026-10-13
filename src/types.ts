export type ModuleId = 'xray' | 'mri' | 'skin';
export type FollowUp = 'routine' | 'soon' | 'urgent';

export interface Analysis {
  image_type_match: boolean;
  quality: 'good' | 'limited' | 'poor';
  quality_note: string;
  observations: string[];
  considerations: string[];
  follow_up: FollowUp;
  follow_up_note: string;
  limitations: string;
}

export interface HistoryItem {
  id: number;
  module: ModuleId;
  date: string;
  quality: string;
  follow_up: FollowUp;
  key: string;
}
