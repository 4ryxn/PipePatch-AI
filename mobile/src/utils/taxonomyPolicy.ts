import type { AnalysisResponse } from "../types/analysis";

export type DamageCategory = NonNullable<AnalysisResponse["damage_category"]>;
export const DAMAGE_LABELS: Record<DamageCategory, string> = {
  clean_transverse_cut: "Clean transverse cut", crack_or_split: "Crack or split", puncture_or_hole: "Puncture or hole", active_leak_or_wet_soil: "Active leak or wet soil", separated_or_broken_fitting: "Separated or broken fitting", valve_or_manifold_damage: "Valve or manifold damage", sprinkler_head_damage: "Sprinkler head damage", no_visible_damage: "No visible damage", unknown_or_unsupported: "Unknown or unsupported",
};
export function categoryFor(analysis: AnalysisResponse): DamageCategory { return analysis.damage_category ?? "unknown_or_unsupported"; }
export function mayContinueToSafety(analysis: AnalysisResponse): boolean { return !analysis.is_mock && analysis.supported_case && categoryFor(analysis) === "clean_transverse_cut"; }
export function blockedCategoryMessage(category: DamageCategory): string { return category === "no_visible_damage" || category === "unknown_or_unsupported" ? "Retake the photo with the damaged area clearly visible. DIY repair guidance is not available yet." : `DIY repair guidance is not available for ${DAMAGE_LABELS[category].toLowerCase()} yet. Seek professional help if the damage is active or uncertain.`; }
export function historyTaxonomyOnly(analysis: AnalysisResponse): { damage_category: DamageCategory } { return { damage_category: categoryFor(analysis) }; }
