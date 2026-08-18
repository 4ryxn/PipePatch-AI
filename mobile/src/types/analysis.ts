export type AnalysisResponse = {
  is_mock: boolean;
  supported_case: boolean;
  material: string | null;
  pipe_schedule: string | null;
  nominal_size: string | null;
  damage_type: string | null;
  confidence: number;
  summary: string;
  evidence: string[];
  unknowns: string[];
  safety_flags: string[];
  next_action: string;
};
