"""FITS inspection data models."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HduInfo(BaseModel):
    index: int = Field(..., description="0-based HDU index")
    name: str = Field(..., description="Extension name (EXTNAME or PRIMARY)")
    hdu_type: str = Field(..., description="HDU class name, e.g. PrimaryHDU, ImageHDU, BinTableHDU")
    shape: Optional[List[int]] = Field(None, description="Array shape if data exists")
    bitpix: Optional[int] = Field(None, description="Data bitpix value if present")


class FitsDimensions(BaseModel):
    naxis: int = Field(..., description="Number of axes in primary or main image HDU")
    width: Optional[int] = Field(None, description="Image width (NAXIS1)")
    height: Optional[int] = Field(None, description="Image height (NAXIS2)")
    depth: Optional[int] = Field(None, description="Depth or bands (NAXIS3) if 3D")


class FitsInspectionResponse(BaseModel):
    filename: str = Field(..., description="Inspected FITS filename")
    file_size_bytes: int = Field(..., description="Payload size in bytes")
    hdu_count: int = Field(..., description="Total count of Header Data Units")
    hdus: List[HduInfo] = Field(default_factory=list, description="Metadata summary for each HDU")
    dimensions: Optional[FitsDimensions] = Field(None, description="Image dimensions if present")
    bitpix: Optional[int] = Field(None, description="BITPIX of primary image")
    date_obs: Optional[str] = Field(None, description="Observation UTC date/time (DATE-OBS)")
    exptime: Optional[float] = Field(None, description="Exposure duration in seconds (EXPTIME)")
    telescope: Optional[str] = Field(None, description="Telescope name (TELESCOP)")
    instrument: Optional[str] = Field(None, description="Instrument name (INSTRUME)")
    object_name: Optional[str] = Field(None, description="Target astronomical object designation")
    filter_band: Optional[str] = Field(None, description="Optical or IR filter band (FILTER)")
    ra_deg: Optional[float] = Field(None, description="Right Ascension in decimal degrees")
    dec_deg: Optional[float] = Field(None, description="Declination in decimal degrees")
    wcs_available: bool = Field(False, description="True if valid celestial WCS coordinates are present")
    pixel_scale_arcsec: Optional[float] = Field(None, description="Pixel scale in arcsec/pixel if computable via WCS/CDELT")
    headers_summary: Dict[str, Any] = Field(default_factory=dict, description="Key header cards safely converted to JSON-serializable types")


class SupportedFormatsResponse(BaseModel):
    extensions: List[str] = Field(..., description="List of recognized FITS file extensions")
    compression: List[str] = Field(..., description="Supported compression algorithms")
    description: str = Field(..., description="Summary of supported astronomical file standards")
