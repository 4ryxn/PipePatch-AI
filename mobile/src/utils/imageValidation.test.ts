import { validateImage } from "./imageValidation";

const valid = { localUri: "file:///pipe.jpg", width: 1200, height: 1200, mimeType: "image/jpeg", fileSize: null, source: "library" as const, originalOwnership: "user_owned" as const };
test("accepts a supported image when file size is unavailable", () => expect(validateImage(valid)).toEqual({ valid: true }));
test("rejects a MIME and extension conflict", () => expect(validateImage({ ...valid, mimeType: "image/png" })).toEqual(expect.objectContaining({ valid: false })));
test("rejects an undersized image", () => expect(validateImage({ ...valid, width: 100 })).toEqual(expect.objectContaining({ valid: false })));

test.each([
  ["content URI with supported MIME", { ...valid, localUri: "content://media/external/images/42" }, true],
  ["query and fragment", { ...valid, localUri: "file:///pipe.PNG?version=1#preview", mimeType: "image/png" }, true],
  ["uppercase extension", { ...valid, localUri: "file:///pipe.WEBP", mimeType: "image/webp" }, true],
  ["missing MIME with supported extension", { ...valid, mimeType: null }, true],
  ["missing extension and MIME", { ...valid, localUri: "content://media/42", mimeType: null }, false],
  ["unsupported explicit extension", { ...valid, localUri: "file:///pipe.heic" }, false],
  ["conflicting MIME and extension", { ...valid, localUri: "file:///pipe.png" }, false],
  ["unsupported MIME", { ...valid, mimeType: "image/heic" }, false],
] as const)("handles %s", (_name, candidate, accepted) => expect(validateImage(candidate)).toEqual(accepted ? { valid: true } : expect.objectContaining({ valid: false })));

test.each([undefined, Number.NaN, Infinity, -Infinity, 0, -1, 1.5])("rejects invalid width %s", (width) => expect(validateImage({ ...valid, width: width as number })).toEqual(expect.objectContaining({ valid: false })));
test.each([undefined, Number.NaN, Infinity, -Infinity, 0, -1, 1.5])("rejects invalid height %s", (height) => expect(validateImage({ ...valid, height: height as number })).toEqual(expect.objectContaining({ valid: false })));
test("accepts dimensions exactly at the minimum and unavailable or large file size", () => { expect(validateImage({ ...valid, width: 960, height: 960, fileSize: null })).toEqual({ valid: true }); expect(validateImage({ ...valid, fileSize: 8 * 1024 * 1024 })).toEqual({ valid: true }); expect(validateImage({ ...valid, fileSize: 9 * 1024 * 1024 })).toEqual({ valid: true }); });
