export type AnalysisResponse = {
  is_mock: boolean;
  supported_case: boolean;
  material: string | null;
  pipe_schedule: string | null;
  nominal_size: string | null;
  damage_type: string | null;
  damage_category?: "clean_transverse_cut" | "crack_or_split" | "puncture_or_hole" | "active_leak_or_wet_soil" | "separated_or_broken_fitting" | "valve_or_manifold_damage" | "sprinkler_head_damage" | "no_visible_damage" | "unknown_or_unsupported";
  confidence: number;
  summary: string;
  evidence: string[];
  unknowns: string[];
  safety_flags: string[];
  next_action: string;
};
