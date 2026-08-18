import { describe, expect, it } from "vitest";
import { begin, cancel, initialRequestState, settle } from "./requestPolicy";
describe("browser analysis request guards", () => {
  it("rejects duplicate submission while an upload is active", () => { const active = begin(initialRequestState); expect(begin(active)).toBe(active); });
  it("ignores a stale response after cancellation", () => { const active = begin(initialRequestState); const cancelled = cancel(active); expect(settle(cancelled, active.id)).toBe(cancelled); });
});
