export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const supportedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const supportedExtensions = new Set(["jpg", "jpeg", "png", "webp"]);

export type ImageFileValidation =
  | { valid: true }
  | { valid: false; message: string };

function extensionOf(name: string): string | undefined {
  const suffix = name.split(/[?#]/, 1)[0].split(".").pop()?.toLowerCase();
  return suffix && suffix !== name.toLowerCase() ? suffix : undefined;
}

/** Checks file metadata only; dimensions and aspect ratio are intentionally unrestricted. */
export function validateImageFile(file: File | null): ImageFileValidation {
  if (!file || file.size === 0) return { valid: false, message: "Choose a readable JPG, PNG, or WebP image." };
  if (file.size > MAX_IMAGE_BYTES) return { valid: false, message: "Choose an image smaller than 8 MB." };
  const extension = extensionOf(file.name);
  const hasSupportedMime = supportedMimeTypes.has(file.type.toLowerCase());
  const hasSupportedExtension = extension !== undefined && supportedExtensions.has(extension);
  return hasSupportedMime || hasSupportedExtension
    ? { valid: true }
    : { valid: false, message: "Choose a JPG, PNG, or WebP image." };
}

/** Verifies browser decoding only; it never resizes, crops, or alters the source file. */
export async function isReadableImage(file: File): Promise<boolean> {
  if (typeof Image === "undefined" || typeof URL.createObjectURL !== "function") return true;
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<boolean>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
