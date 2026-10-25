"""ASTRION Observation and Pixel Statistics Data Models.

Defines schemas for ingested astronomical observations, pixel array metrics,
and HDU topology.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from backend.app.models.fits import FitsDimensions, HduInfo


class PixelStatistics(BaseModel):
    """Authentic mathematical pixel statistics computed via NumPy / Astropy."""
    min: Optional[float] = Field(None, description="Minimum finite pixel value")
    max: Optional[float] = Field(None, description="Maximum finite pixel value")
    mean: Optional[float] = Field(None, description="Arithmetic mean of finite pixels")
    median: Optional[float] = Field(None, description="Median pixel intensity")
    std: Optional[float] = Field(None, description="Standard deviation of finite pixels")
    valid_pixels: int = Field(0, description="Count of valid finite, non-masked pixels")
    nan_pixels: int = Field(0, description="Count of NaN (Not-a-Number) pixels")
    inf_pixels: int = Field(0, description="Count of positive or negative infinite pixels")
    total_pixels: int = Field(0, description="Total pixels in array (width * height)")


class ObservationRecord(BaseModel):
    """Full persisted astronomical observation record."""
    id: str = Field(..., description="Unique observation identifier (e.g. obs_uuid)")
    filename: str = Field(..., description="Original FITS filename")
    file_size_bytes: int = Field(..., description="File size on disk in bytes")
    file_hash: Optional[str] = Field(None, description="SHA256 hex digest for integrity and deduplication")
    file_exists: bool = Field(True, description="True if source FITS file is currently verified on disk")
    created_at: str = Field(..., description="UTC timestamp of ingestion")
    
    # Astronomical Observation Parameters
    date_obs: Optional[str] = Field(None, description="Observation UTC date/time (DATE-OBS)")
    exptime: Optional[float] = Field(None, description="Exposure duration in seconds (EXPTIME)")
    telescope: Optional[str] = Field(None, description="Telescope name (TELESCOP)")
    instrument: Optional[str] = Field(None, description="Instrument designation (INSTRUME)")
    object_name: Optional[str] = Field(None, description="Target object designation (OBJECT)")
    filter_band: Optional[str] = Field(None, description="Optical or IR filter band (FILTER)")
    equinox: Optional[float] = Field(None, description="Equinox of celestial coordinates (e.g. 2000.0)")
    
    # Astrometry & WCS
    ra_deg: Optional[float] = Field(None, description="Right Ascension in decimal degrees")
    dec_deg: Optional[float] = Field(None, description="Declination in decimal degrees")
    wcs_available: bool = Field(False, description="True if valid celestial WCS is present")
    pixel_scale_arcsec: Optional[float] = Field(None, description="Pixel scale in arcsec/pixel")
    
    # HDU & Image Topology
    selected_hdu_index: int = Field(0, description="HDU index selected for scientific analysis")
    selected_hdu_name: str = Field("PRIMARY", description="Name of selected HDU")
    selected_hdu_type: str = Field("PrimaryHDU", description="Class type of selected HDU")
    total_hdus: int = Field(1, description="Total count of HDUs in file")
    hdus: List[HduInfo] = Field(default_factory=list, description="All HDUs summary")
    
    # Dimensions & Data Type
    dimensions: Optional[FitsDimensions] = Field(None, description="Array dimensions (NAXIS, NAXIS1, NAXIS2)")
    bitpix: Optional[int] = Field(None, description="BITPIX of image HDU")
    dtype: Optional[str] = Field(None, description="NumPy array data type, e.g. float32")
    
    # Pixel Statistics
    statistics: Optional[PixelStatistics] = Field(None, description="NumPy computed statistical distribution")
    
    # Header summary & status
    headers_summary: Dict[str, Any] = Field(default_factory=dict, description="Key astrometric header cards")
    ingestion_status: str = Field("ingested", description="Ingestion state: ingested | error | missing_file")
    has_preview: bool = Field(False, description="True if preview PNG is generated")
    preview_url: Optional[str] = Field(None, description="Relative URL to retrieve preview image")


class ObservationListResponse(BaseModel):
    """API response for listing observations."""
    count: int = Field(..., description="Total count of loaded observations")
    observations: List[ObservationRecord] = Field(default_factory=list, description="List of observation records")


class IngestResponse(BaseModel):
    """API response returned upon successful FITS ingestion."""
    status: str = Field("success", description="Status string: success or duplicate")
    message: str = Field(..., description="Human-readable result summary")
    observation: ObservationRecord = Field(..., description="Ingested observation entity")
