import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, validateImageFile } from "./imageValidation";

const image = (name: string, type: string, bytes = 12): File => new File([new Uint8Array(bytes)], name, { type });

describe("selected image validation", () => {
  it.each([
    ["portrait.jpg", "image/jpeg"],
    ["landscape.png", "image/png"],
    ["square.webp", "image/webp"],
    ["below-960.jpg", "image/jpeg"],
  ])("accepts %s without inspecting dimensions or aspect ratio", (name, type) => {
    expect(validateImageFile(image(name, type))).toEqual({ valid: true });
  });

  it("accepts a supported filename when the browser omits the MIME type", () => {
    expect(validateImageFile(image("camera.WEBP", ""))).toEqual({ valid: true });
  });

  it("rejects an empty file", () => {
    expect(validateImageFile(image("empty.jpg", "image/jpeg", 0))).toMatchObject({ valid: false });
  });

  it("rejects a file above the backend 8 MB limit", () => {
    expect(validateImageFile(image("large.jpg", "image/jpeg", MAX_IMAGE_BYTES + 1))).toEqual({ valid: false, message: "Choose an image smaller than 8 MB." });
  });

  it("rejects an unsupported format", () => {
    expect(validateImageFile(image("notes.gif", "image/gif"))).toMatchObject({ valid: false });
  });
});
