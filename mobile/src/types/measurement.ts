import type { NominalPipeSize } from "./repair";
export type ImagePoint = { x: number; y: number };
export type MeasurementResponse = { status: "measured" | "needs_retake"; estimated_outer_diameter_mm: number | null; estimated_gap_mm: number | null; quality_score: number; pixels_per_mm: number | null; marker_id: 23; known_marker_side_mm: 50; suggested_nominal_size: NominalPipeSize | null; gap_range_status: "within_mvp_range" | "below_mvp_range" | "above_mvp_range" | "unknown"; limitations: string[]; retake_reasons: string[] };
