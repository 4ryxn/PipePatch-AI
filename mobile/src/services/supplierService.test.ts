import { requestSuppliers } from "./supplierService";

describe("supplier service", () => {
  afterEach(() => { jest.restoreAllMocks(); });
  test("maps the full ephemeral context to the supplier endpoint", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ decision: "eligible", suppliers: [], reasons: [], fallback_search_url: "x", fallback_message: null, provider_enabled: false, attribution: "© OpenStreetMap contributors", data_disclaimer: "x" }) } as Response);
    await requestSuppliers({ analysis: {} as never, confirmations: {} as never, measurement: {} as never, area: "Pune", radius_km: 5, max_results: 10 }, new AbortController().signal);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/v1/suppliers/search"), expect.objectContaining({ method: "POST", headers: { "Content-Type": "application/json" } }));
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toContain("Pune");
  });
});
