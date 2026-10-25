"""ASTRION Backend Models."""

from backend.app.models.health import HealthResponse
from backend.app.models.system import SystemInfoResponse
from backend.app.models.fits import (
    HduInfo,
    FitsDimensions,
    FitsInspectionResponse,
    SupportedFormatsResponse,
)
from backend.app.models.observation import (
    PixelStatistics,
    ObservationRecord,
    ObservationListResponse,
    IngestResponse,
)
from backend.app.models.detection import (
    DetectionParameters,
    DetectedSource,
    DetectionRequest,
    DetectionResponse,
    BackgroundMetadataResponse,
)
from backend.app.models.registration import (
    RegistrationRequest,
    RegistrationResponse,
)

__all__ = [
    "HealthResponse",
    "SystemInfoResponse",
    "HduInfo",
    "FitsDimensions",
    "FitsInspectionResponse",
    "SupportedFormatsResponse",
    "PixelStatistics",
    "ObservationRecord",
    "ObservationListResponse",
    "IngestResponse",
    "DetectionParameters",
    "DetectedSource",
    "DetectionRequest",
    "DetectionResponse",
    "BackgroundMetadataResponse",
    "RegistrationRequest",
    "RegistrationResponse",
]
