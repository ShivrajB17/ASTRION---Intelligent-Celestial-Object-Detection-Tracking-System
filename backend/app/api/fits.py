"""FITS inspection endpoints."""

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from backend.app.config import settings
from backend.app.models.fits import FitsInspectionResponse, SupportedFormatsResponse
from backend.app.services.fits_inspector import FitsInspectorService

router = APIRouter(prefix="/api/fits", tags=["FITS"])


@router.get("/supported-formats", response_model=SupportedFormatsResponse)
def get_supported_formats() -> SupportedFormatsResponse:
    """Returns officially supported astronomical FITS file formats and compression types."""
    return FitsInspectorService.get_supported_formats()


@router.post("/inspect", response_model=FitsInspectionResponse)
async def inspect_fits_file(
    file: UploadFile = File(..., description="Astronomical FITS file payload"),
) -> FitsInspectionResponse:
    """Authentically parses an uploaded FITS file and returns genuine astrometric metadata.
    
    Uses astropy.io.fits to parse HDUs and extract WCS coordinates without
    loading full image arrays into memory.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename.",
        )

    # Check extension heuristic
    lower_name = file.filename.lower()
    valid_extensions = (".fits", ".fit", ".fts", ".gz", ".tar")
    if not any(lower_name.endswith(ext) for ext in valid_extensions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file.filename}'. Expected .fits, .fit, or .fts",
        )

    try:
        content = bytearray()
        chunk_size = 1024 * 1024  # 1 MB chunk
        while chunk := await file.read(chunk_size):
            content.extend(chunk)
            if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"FITS file exceeds maximum permitted upload limit of {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB.",
                )

        if len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes).",
            )

        metadata = FitsInspectorService.inspect_file(
            file_bytes=bytes(content),
            filename=file.filename,
        )
        return metadata
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error processing FITS file: {exc}",
        ) from exc
