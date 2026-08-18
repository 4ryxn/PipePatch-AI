export type CalibrationStatus = "calibrated" | "needs_retake";

export type CalibrationResponse = {
  status: CalibrationStatus;
  pixels_per_mm: number | null;
  marker_id: 23;
  known_marker_side_mm: 50;
  quality_score: number;
  retake_reasons: string[];
  capture_tips: string[];
  scope_note: string;
};
