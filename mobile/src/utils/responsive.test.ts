import { contentWidth, isCompact, reviewImageHeight } from "./responsive";
test("bounds content width for phones and tablets", () => { expect(contentWidth(320)).toBe(272); expect(contentWidth(768)).toBe(640); });
test("uses bounded review heights across compact and large viewports", () => { expect(reviewImageHeight({ width: 320, height: 568 })).toBe(239); expect(reviewImageHeight({ width: 768, height: 1024 })).toBe(360); expect(isCompact({ width: 320, height: 568 })).toBe(true); });
