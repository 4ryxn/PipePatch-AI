export type Account = { id: string; email: string; created_at: string };
export type HistorySummary = { outcome: "supported" | "rejected"; confirmed_nominal_size: "1/2" | "3/4" | "1" | null; repair_method_id: "two_slip_coupling_section_replacement" | null; measured_gap_range_status: string; generic_parts_item_names: string[]; safety_and_limitation_text: string[] };
export type HistoryEntry = { id: string; title: string; created_at: string; summary: HistorySummary };
