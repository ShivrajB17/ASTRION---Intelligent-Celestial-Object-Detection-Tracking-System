"""Unit and integration tests for ASTRION scientific backend."""

import io
import numpy as np
import pytest
from astropy.io import fits
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def create_synthetic_fits(
    data_shape=(64, 64),
    include_wcs=True,
    include_metadata=True,
) -> bytes:
    """Generates a real in-memory FITS file using astropy."""
    if data_shape:
        data = np.zeros(data_shape, dtype=np.float32)
        hdu = fits.PrimaryHDU(data=data)
    else:
        hdu = fits.PrimaryHDU()

    if include_metadata:
        hdu.header["OBJECT"] = "TEST-ASTEROID-2026"
        hdu.header["TELESCOP"] = "SPHEREx All-Sky"
        hdu.header["INSTRUME"] = "NIR Spectrometer"
        hdu.header["FILTER"] = "Band 3"
        hdu.header["DATE-OBS"] = "2026-10-25T14:30:00"
        hdu.header["EXPTIME"] = 60.5
        hdu.header["RA"] = 184.225
        hdu.header["DEC"] = 29.814

    if include_wcs and data_shape:
        hdu.header["CTYPE1"] = "RA---TAN"
        hdu.header["CTYPE2"] = "DEC--TAN"
        hdu.header["CRVAL1"] = 184.225
        hdu.header["CRVAL2"] = 29.814
        hdu.header["CRPIX1"] = 32.0
        hdu.header["CRPIX2"] = 32.0
        # ~1 arcsec per pixel = 1/3600 deg ~ 0.000277778
        hdu.header["CDELT1"] = -0.000277778
        hdu.header["CDELT2"] = 0.000277778

    buffer = io.BytesIO()
    hdul = fits.HDUList([hdu])
    hdul.writeto(buffer)
    return buffer.getvalue()


def test_health_endpoint():
    """Verify /health returns healthy status and uptime."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "uptime_seconds" in data
    assert data["uptime_seconds"] >= 0


def test_system_info_endpoint():
    """Verify /api/system/info returns genuine runtime and dependency metadata."""
    response = client.get("/api/system/info")
    assert response.status_code == 200
    data = response.json()
    assert "python_version" in data
    assert "platform" in data
    assert "dependencies" in data
    deps = data["dependencies"]
    assert "astropy" in deps
    assert "numpy" in deps
    assert "fastapi" in deps
    assert deps["astropy"] != "not installed"
    assert deps["numpy"] != "not installed"


def test_fits_supported_formats():
    """Verify /api/fits/supported-formats returns format specifications."""
    response = client.get("/api/fits/supported-formats")
    assert response.status_code == 200
    data = response.json()
    assert ".fits" in data["extensions"]
    assert ".fit" in data["extensions"]
    assert len(data["compression"]) > 0


def test_valid_fits_inspection():
    """Verify authentic inspection of a genuine FITS file."""
    fits_bytes = create_synthetic_fits(
        data_shape=(128, 128),
        include_wcs=True,
        include_metadata=True,
    )

    response = client.post(
        "/api/fits/inspect",
        files={"file": ("target_survey.fits", fits_bytes, "application/octet-stream")},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["filename"] == "target_survey.fits"
    assert data["file_size_bytes"] == len(fits_bytes)
    assert data["hdu_count"] == 1
    assert data["dimensions"]["width"] == 128
    assert data["dimensions"]["height"] == 128
    assert data["dimensions"]["naxis"] == 2
    assert data["bitpix"] == -32
    assert data["object_name"] == "TEST-ASTEROID-2026"
    assert data["telescope"] == "SPHEREx All-Sky"
    assert data["instrument"] == "NIR Spectrometer"
    assert data["filter_band"] == "Band 3"
    assert data["date_obs"] == "2026-10-25T14:30:00"
    assert pytest.approx(data["exptime"], 0.1) == 60.5
    assert pytest.approx(data["ra_deg"], 0.001) == 184.225
    assert pytest.approx(data["dec_deg"], 0.001) == 29.814
    assert data["wcs_available"] is True
    assert data["pixel_scale_arcsec"] is not None
    assert pytest.approx(data["pixel_scale_arcsec"], 0.05) == 1.0


def test_missing_metadata_fits_inspection():
    """Verify missing metadata is reported as null and never fabricated."""
    fits_bytes = create_synthetic_fits(
        data_shape=None,
        include_wcs=False,
        include_metadata=False,
    )

    response = client.post(
        "/api/fits/inspect",
        files={"file": ("bare_header.fits", fits_bytes, "application/octet-stream")},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["filename"] == "bare_header.fits"
    assert data["hdu_count"] == 1
    assert data["object_name"] is None
    assert data["telescope"] is None
    assert data["instrument"] is None
    assert data["filter_band"] is None
    assert data["date_obs"] is None
    assert data["exptime"] is None
    assert data["ra_deg"] is None
    assert data["dec_deg"] is None
    assert data["wcs_available"] is False
    assert data["pixel_scale_arcsec"] is None


def test_invalid_corrupted_fits_file():
    """Verify that corrupt data sent as .fits is rejected with 422."""
    corrupt_bytes = b"NOT_A_VALID_FITS_HEADER_PADDING_PADDING_RANDOM_BYTES"
    response = client.post(
        "/api/fits/inspect",
        files={"file": ("corrupt.fits", corrupt_bytes, "application/octet-stream")},
    )
    assert response.status_code == 422
    assert "Failed to parse FITS data" in response.json()["detail"]


def test_empty_file_rejection():
    """Verify that 0-byte upload is rejected with 400."""
    response = client.post(
        "/api/fits/inspect",
        files={"file": ("empty.fits", b"", "application/octet-stream")},
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"]


def test_unsupported_file_extension():
    """Verify that non-FITS file extension is rejected with 400."""
    response = client.post(
        "/api/fits/inspect",
        files={"file": ("report.pdf", b"dummy pdf content", "application/pdf")},
    )
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]
