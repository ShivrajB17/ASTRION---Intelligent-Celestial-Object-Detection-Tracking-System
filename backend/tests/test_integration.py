"""Additional integration and hardening tests for ASTRION backend."""

import io
import numpy as np
import pytest
from astropy.io import fits
from fastapi.testclient import TestClient

from backend.app.config import settings
from backend.app.main import app

client = TestClient(app)


def test_consistent_json_error_format():
    """Verify that errors adhere to the structured JSON envelope."""
    response = client.post(
        "/api/fits/inspect",
        files={"file": ("corrupt.fits", b"BAD_BYTES", "application/octet-stream")},
    )
    assert response.status_code == 422
    data = response.json()
    assert data["status"] == "error"
    assert "detail" in data
    assert data["status_code"] == 422


def test_multi_extension_fits_inspection():
    """Verify Multi-Extension FITS (MEF) topology inspection."""
    primary_hdu = fits.PrimaryHDU()
    primary_hdu.header["OBJECT"] = "MEF-SURVEY-FIELD"

    image_data = np.zeros((100, 100), dtype=np.int16)
    image_hdu = fits.ImageHDU(data=image_data, name="SCI")
    image_hdu.header["FILTER"] = "F110W"
    image_hdu.header["EXPTIME"] = 300.0

    hdul = fits.HDUList([primary_hdu, image_hdu])
    buffer = io.BytesIO()
    hdul.writeto(buffer)
    fits_bytes = buffer.getvalue()

    response = client.post(
        "/api/fits/inspect",
        files={"file": ("mef_survey.fits", fits_bytes, "application/octet-stream")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["hdu_count"] == 2
    assert len(data["hdus"]) == 2
    assert data["hdus"][0]["name"] == "PRIMARY"
    assert data["hdus"][1]["name"] == "SCI"
    assert data["dimensions"]["width"] == 100
    assert data["dimensions"]["height"] == 100
    assert data["object_name"] == "MEF-SURVEY-FIELD"


def test_fits_with_cd_matrix_wcs():
    """Verify WCS extraction using CD1_1, CD1_2, CD2_1, CD2_2 matrix."""
    data = np.zeros((50, 50), dtype=np.float32)
    hdu = fits.PrimaryHDU(data=data)
    hdu.header["CTYPE1"] = "RA---TAN"
    hdu.header["CTYPE2"] = "DEC--TAN"
    hdu.header["CRVAL1"] = 120.5
    hdu.header["CRVAL2"] = -15.2
    hdu.header["CRPIX1"] = 25.0
    hdu.header["CRPIX2"] = 25.0
    # ~0.5 arcsec per pixel
    scale_deg = (0.5 / 3600.0)
    hdu.header["CD1_1"] = -scale_deg
    hdu.header["CD1_2"] = 0.0
    hdu.header["CD2_1"] = 0.0
    hdu.header["CD2_2"] = scale_deg

    buffer = io.BytesIO()
    hdul = fits.HDUList([hdu])
    hdul.writeto(buffer)
    fits_bytes = buffer.getvalue()

    response = client.post(
        "/api/fits/inspect",
        files={"file": ("cd_matrix.fits", fits_bytes, "application/octet-stream")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["wcs_available"] is True
    assert data["pixel_scale_arcsec"] is not None
    assert pytest.approx(data["pixel_scale_arcsec"], 0.05) == 0.5


def test_file_size_limit_rejection(monkeypatch):
    """Verify that files exceeding MAX_UPLOAD_SIZE_BYTES are rejected with 413."""
    # Temporarily set limit to 100 bytes to test rejection without allocating 500MB
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_BYTES", 100)

    large_payload = b"SIMPLE  =                    T" * 20  # ~600 bytes
    response = client.post(
        "/api/fits/inspect",
        files={"file": ("oversized.fits", large_payload, "application/octet-stream")},
    )
    assert response.status_code == 413
    data = response.json()
    assert data["status"] == "error"
    assert "exceeds maximum permitted upload limit" in data["detail"]
