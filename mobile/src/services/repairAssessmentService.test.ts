/* eslint-disable import/first */
const mockFetch = jest.fn();
jest.mock("../config/api", () => ({ apiBaseUrl: "http://example.test" }));
import { requestRepairAssessment } from "./repairAssessmentService";

const payload = { analysis: { is_mock: false, supported_case: true, material: null, pipe_schedule: null, nominal_size: null, damage_type: null, confidence: 0.8, summary: "", evidence: [], unknowns: [], safety_flags: [], next_action: "" }, confirmations: { line_type: "outdoor_irrigation" as const, outdoor_irrigation: "yes" as const, water_supply_shut_off: "yes" as const, pvc_schedule_40_marking: "yes" as const, nominal_size: "1/2" as const, clean_transverse_cut: "yes" as const, no_additional_damage: "yes" as const, straight_section: "yes" as const, safely_away_from_components: "yes" as const, pipe_ends_accessible: "yes" as const } };
const assessment = { decision: "eligible" as const, reasons: ["ok"], safety_warnings: [], confirmed_pipe_size: "1/2" as const, repair_method_id: "two_slip_coupling_section_replacement" as const, parts: ["pipe"], tools: ["cutter"] };
beforeEach(() => { jest.clearAllMocks(); Object.defineProperty(global, "fetch", { configurable: true, value: mockFetch }); mockFetch.mockResolvedValue({ ok: true, json: async () => assessment }); });
test("posts typed confirmations to the deterministic assessment endpoint", async () => { await expect(requestRepairAssessment(payload, new AbortController().signal)).resolves.toEqual(assessment); expect(mockFetch).toHaveBeenCalledWith("http://example.test/api/v1/repair-assessment", expect.objectContaining({ method: "POST", headers: { "Content-Type": "application/json" }})); });
