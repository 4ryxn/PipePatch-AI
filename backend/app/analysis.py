"""Ephemeral validation for the mock image-analysis endpoint."""

from fastapi import HTTPException, UploadFile

MAX_UPLOAD_BYTES = 8 * 1024 * 1024
READ_CHUNK_BYTES = 64 * 1024

_JPEG = b"\xff\xd8\xff"
_PNG = b"\x89PNG\r\n\x1a\n"
_WEBP_RIFF = b"RIFF"
_WEBP_WEBP = b"WEBP"
_SUPPORTED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


class ValidatedImage:
    """Validated in-memory image bytes; no filename is retained."""

    def __init__(self, content: bytes, content_type: str) -> None:
        self.content = content
        self.content_type = content_type


def signature_content_type(header: bytes) -> str | None:
    """Identify one supported format from its non-sensitive leading bytes."""
    if header.startswith(_JPEG):
        return "image/jpeg"
    if header.startswith(_PNG):
        return "image/png"
    if len(header) >= 12 and header.startswith(_WEBP_RIFF) and header[8:12] == _WEBP_WEBP:
        return "image/webp"
    return None


async def validate_upload(image: UploadFile) -> ValidatedImage:
    """Consume, validate, and return a bounded image in memory only."""
    try:
        declared_content_type = image.content_type
        if declared_content_type not in _SUPPORTED_CONTENT_TYPES:
            raise HTTPException(status_code=415, detail="Use a JPG, PNG, or WebP image.")

        header = await image.read(12)
        if not header:
            raise HTTPException(status_code=422, detail="The uploaded image is empty.")

        detected_content_type = signature_content_type(header)
        if detected_content_type is None or detected_content_type != declared_content_type:
            raise HTTPException(
                status_code=415, detail="The image format does not match its declared type."
            )

        chunks = [header]
        total_bytes = len(header)
        while chunk := await image.read(READ_CHUNK_BYTES):
            total_bytes += len(chunk)
            if total_bytes > MAX_UPLOAD_BYTES:
                raise HTTPException(status_code=413, detail="The uploaded image is too large.")
            chunks.append(chunk)
        return ValidatedImage(content=b"".join(chunks), content_type=declared_content_type)
    finally:
        await image.close()
