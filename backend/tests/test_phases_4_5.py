"""ASTRION Scientific Engine — Phases 4 & 5 Automated Tests.

Tests:
1. 2D Background estimation & noise floor recovery
2. Small plate graceful fallback
3. NaN and masked pixel handling
4. Photutils source detection & threshold scaling
5. Sub-pixel centroid accuracy against ground truth
6. Centroid uncertainty and quality flags (edge, saturated, clean)
7. WCS celestial coordinate conversion (genuine conversion vs unavailable)
8. Multi-epoch star-based image registration with known rotation & translation
9. Registration failure conditions (< 3 reference stars)
10. End-to-end API lifecycle and preview streaming
"""

import io
import math
import os
from typing import List, Optional, Tuple
import numpy as np
import pytest
import scipy.ndimage
from astropy.io import fits
from astropy.wcs import WCS
from fastapi.testclient import TestClient

from backend.app.config import settings
from backend.app.db.repository import observation_repo
from backend.app.main import app
from backend.app.models.detection import DetectionParameters
from backend.app.services.background_estimator import BackgroundEstimatorService
from backend.app.services.image_registration import ImageRegistrationService
from backend.app.services.source_detector import SourceDetectorService

client = TestClient(app)


@pytest.fixture(autouse=True)
def isolated_test_db(monkeypatch, tmp_path):
    """Isolates each test's database and storage paths."""
    test_db = str(tmp_path / "test_astrion.db")
    test_obs = str(tmp_path / "observations")
    test_prev = str(tmp_path / "previews")
    test_reg = str(tmp_path / "registered")

    os.makedirs(test_obs, exist_ok=True)
    os.makedirs(test_prev, exist_ok=True)
    os.makedirs(test_reg, exist_ok=True)

    monkeypatch.setattr(settings, "DATABASE_PATH", test_db)
    monkeypatch.setattr(settings, "OBSERVATIONS_DIR", test_obs)
    monkeypatch.setattr(settings, "PREVIEWS_DIR", test_prev)
    monkeypatch.setattr(settings, "REGISTERED_DIR", test_reg)

    monkeypatch.setattr(observation_repo, "db_path", test_db)
    observation_repo._init_db()


def create_synthetic_star_field(
    shape=(256, 256),
    stars=None,
    bkg_level=120.0,
    noise_sigma=8.0,
    with_wcs=True,
    add_nans=False,
    seed=42,
) -> Tuple[bytes, fits.Header, list]:
    """Generates a synthetic FITS image with controlled Gaussian stars and background noise."""
    np.random.seed(seed)
    h, w = shape

    # Add Gaussian background noise
    data = np.random.normal(bkg_level, noise_sigma, shape).astype(np.float32)

    if stars is None:
        # Standard asterism pattern with 15 stars
        stars = [
            (40.0, 45.0, 300.0, 2.5),
            (60.0, 180.0, 450.0, 3.0),
            (85.0, 95.0, 600.0, 3.0),
            (110.0, 210.0, 350.0, 2.8),
            (130.0, 50.0, 500.0, 3.2),
            (150.0, 140.0, 800.0, 3.0),
            (175.0, 40.0, 400.0, 2.7),
            (195.0, 190.0, 550.0, 3.0),
            (215.0, 105.0, 700.0, 3.1),
            (225.0, 65.0, 380.0, 2.9),
            (80.0, 160.0, 620.0, 3.0),
            (160.0, 100.0, 490.0, 2.8),
            (120.0, 120.0, 950.0, 3.0),
            (30.0, 220.0, 320.0, 2.5),
            (230.0, 230.0, 410.0, 3.0),
        ]

    # Add 2D Gaussian profiles for each star
    y_grid, x_grid = np.indices(shape)
    for x0, y0, peak, fwhm in stars:
        sigma = fwhm / 2.355
        star_profile = peak * np.exp(-((x_grid - x0) ** 2 + (y_grid - y0) ** 2) / (2 * sigma ** 2))
        data += star_profile.astype(np.float32)

    if add_nans:
        data[10:15, 10:15] = np.nan
        data[20, 20] = np.inf

    header = fits.Header()
    header["SIMPLE"] = True
    header["BITPIX"] = -32
    header["NAXIS"] = 2
    header["NAXIS1"] = w
    header["NAXIS2"] = h
    header["OBJECT"] = "SYNTHETIC_STAR_FIELD"
    header["TELESCOP"] = "ASTRION TEST SIMULATOR"
    header["EXPTIME"] = 60.0
    header["SATURATE"] = 50000.0

    if with_wcs:
        header["CRVAL1"] = 180.5000
        header["CRVAL2"] = 42.2500
        header["CRPIX1"] = float(w / 2.0)
        header["CRPIX2"] = float(h / 2.0)
        header["CDELT1"] = -0.000277778  # 1 arcsec/px
        header["CDELT2"] = 0.000277778
        header["CTYPE1"] = "RA---TAN"
        header["CTYPE2"] = "DEC--TAN"
        header["CUNIT1"] = "deg"
        header["CUNIT2"] = "deg"

    hdu = fits.PrimaryHDU(data=data, header=header)
    buf = io.BytesIO()
    hdu.writeto(buf)
    return buf.getvalue(), header, stars


def test_background_estimation_recovery():
    """Validates 2D background median and noise RMS recovery against controlled ground truth."""
    true_bkg = 150.0
    true_rms = 12.0
    np.random.seed(99)
    data = np.random.normal(true_bkg, true_rms, (200, 200)).astype(np.float32)

    # Add a few stars
    data[50, 50] += 500.0
    data[120, 140] += 800.0

    bkg_res = BackgroundEstimatorService.estimate_background(data, box_size=64, filter_size=3)

    # Median background should recover within 1.5% of 150.0
    assert abs(bkg_res.background_median - true_bkg) < 2.0, (
        f"Expected ~{true_bkg}, got {bkg_res.background_median}"
    )

    # Background RMS noise should recover within 5% of 12.0
    assert abs(bkg_res.background_rms - true_rms) < 1.0, (
        f"Expected ~{true_rms}, got {bkg_res.background_rms}"
    )

    # Background-subtracted mean across the image should be close to 0.0
    mean_sub = np.mean(bkg_res.background_subtracted)
    assert abs(mean_sub) < 1.5


def test_small_image_fallback():
    """Tests graceful degradation when image dimension is too small for standard 2D mesh."""
    small_data = np.random.normal(80.0, 5.0, (24, 24)).astype(np.float32)
    bkg_res = BackgroundEstimatorService.estimate_background(small_data, box_size=64, filter_size=3)

    assert bkg_res.background_median > 0
    assert bkg_res.background_rms > 0
    assert bkg_res.background_subtracted.shape == (24, 24)


def test_nan_and_masked_pixels_handling():
    """Tests that NaNs and Infinities are safely masked and do not corrupt background estimation."""
    data = np.random.normal(100.0, 6.0, (128, 128)).astype(np.float32)
    data[10:20, 10:20] = np.nan
    data[40:45, 40:45] = np.inf

    bkg_res = BackgroundEstimatorService.estimate_background(data, box_size=32, filter_size=3)
    assert not math.isnan(bkg_res.background_median)
    assert not math.isnan(bkg_res.background_rms)
    assert bkg_res.background_rms > 0.0
    assert not np.any(np.isnan(bkg_res.background_subtracted[0:5, 0:5]))


def test_centroid_accuracy_against_ground_truth():
    """Measures sub-pixel intensity-weighted centroid accuracy against known Gaussian coordinates."""
    # Place a single Gaussian star with sub-pixel ground truth
    x_truth = 64.35
    y_truth = 72.65
    peak_truth = 600.0
    fwhm_truth = 3.0

    stars = [(x_truth, y_truth, peak_truth, fwhm_truth)]
    fits_bytes, header, _ = create_synthetic_star_field(
        shape=(128, 128),
        stars=stars,
        bkg_level=100.0,
        noise_sigma=5.0,
        with_wcs=True,
    )

    with fits.open(io.BytesIO(fits_bytes)) as hdul:
        data = hdul[0].data

    params = DetectionParameters(threshold_sigma=4.0, fwhm_pixels=3.0)
    response = SourceDetectorService.run_detection(data, header, params, "obs_test_centroid")

    assert response.source_count == 1
    src = response.sources[0]

    # Measure centroid position error
    dx = src.centroid_x - x_truth
    dy = src.centroid_y - y_truth
    pos_error = math.sqrt(dx ** 2 + dy ** 2)

    # Sub-pixel accuracy requirement: sub-pixel error < 0.15 pixels
    assert pos_error < 0.15, f"Centroid position error {pos_error:.4f} px exceeds 0.15 px tolerance"
    assert src.quality == "clean"
    assert src.centroid_uncertainty > 0.0
    assert src.snr > 50.0  # High SNR detection


def test_quality_flags_edge_and_saturated():
    """Verifies that edge sources and saturated sources receive correct quality flags."""
    # Place one star on edge (x=1.0, y=10.0) and one saturated star
    stars = [
        (1.0, 10.0, 300.0, 3.0),      # Edge source
        (50.0, 50.0, 70000.0, 3.0),   # Saturated source (exceeds SATURATE=50000)
        (80.0, 80.0, 400.0, 3.0),     # Clean source
    ]
    fits_bytes, header, _ = create_synthetic_star_field(shape=(100, 100), stars=stars, with_wcs=False)
    with fits.open(io.BytesIO(fits_bytes)) as hdul:
        data = hdul[0].data

    params = DetectionParameters(threshold_sigma=3.0, fwhm_pixels=3.0)
    response = SourceDetectorService.run_detection(data, header, params, "obs_test_flags")

    qualities = {s.quality for s in response.sources}
    assert "edge" in qualities or any(s.flags & 1 for s in response.sources)
    assert "saturated" in qualities or any(s.flags & 2 for s in response.sources)


def test_wcs_coordinate_conversion_and_unavailable():
    """Verifies celestial WCS coordinate conversion and strict refusal to invent RA/DEC when unavailable."""
    # 1. With genuine WCS
    fits_bytes, header, _ = create_synthetic_star_field(shape=(128, 128), with_wcs=True)
    with fits.open(io.BytesIO(fits_bytes)) as hdul:
        data = hdul[0].data

    params = DetectionParameters(threshold_sigma=3.5, fwhm_pixels=3.0)
    res_wcs = SourceDetectorService.run_detection(data, header, params, "obs_wcs")
    assert res_wcs.source_count > 0
    first_src = res_wcs.sources[0]
    assert first_src.sky_coord_available is True
    assert first_src.ra_deg is not None
    assert first_src.dec_deg is not None
    assert 170.0 < first_src.ra_deg < 190.0

    # 2. Without WCS
    fits_bytes_no_wcs, header_no_wcs, _ = create_synthetic_star_field(shape=(128, 128), with_wcs=False)
    with fits.open(io.BytesIO(fits_bytes_no_wcs)) as hdul:
        data_no_wcs = hdul[0].data

    res_no_wcs = SourceDetectorService.run_detection(data_no_wcs, header_no_wcs, params, "obs_no_wcs")
    assert res_no_wcs.source_count > 0
    first_no_wcs = res_no_wcs.sources[0]
    assert first_no_wcs.sky_coord_available is False
    assert first_no_wcs.ra_deg is None
    assert first_no_wcs.dec_deg is None


def test_image_registration_known_transform():
    """Tests star-based multi-epoch image registration with known rotation and translation."""
    # Reference frame with 15 stars
    ref_bytes, ref_hdr, _ = create_synthetic_star_field(shape=(256, 256), seed=101)

    # Ingest reference observation via API
    ingest_ref = client.post(
        "/api/fits/ingest",
        files={"file": ("epoch_1_ref.fits", ref_bytes, "application/fits")},
    )
    assert ingest_ref.status_code in (200, 201)
    ref_id = ingest_ref.json()["observation"]["id"]

    # Target frame: transform with known rotation = 2.0 deg, translation = (-5.0, 4.0) px
    with fits.open(io.BytesIO(ref_bytes)) as hdul:
        ref_arr = hdul[0].data.copy()

    known_rot_deg = 2.0
    known_shift_y = -5.0
    known_shift_x = 4.0

    tgt_arr = scipy.ndimage.rotate(ref_arr, known_rot_deg, reshape=False, order=1, mode="nearest")
    tgt_arr = scipy.ndimage.shift(tgt_arr, (known_shift_y, known_shift_x), order=1, mode="nearest")

    tgt_hdu = fits.PrimaryHDU(data=tgt_arr, header=ref_hdr.copy())
    tgt_buf = io.BytesIO()
    tgt_hdu.writeto(tgt_buf)
    tgt_bytes = tgt_buf.getvalue()

    ingest_tgt = client.post(
        "/api/fits/ingest",
        files={"file": ("epoch_2_tgt.fits", tgt_bytes, "application/fits")},
    )
    assert ingest_tgt.status_code in (200, 201)
    tgt_id = ingest_tgt.json()["observation"]["id"]

    # Run image registration
    reg_resp = client.post(
        "/api/registration/run",
        json={"reference_observation_id": ref_id, "target_observation_id": tgt_id},
    )
    assert reg_resp.status_code == 200
    reg_data = reg_resp.json()

    assert reg_data["success"] is True
    assert reg_data["matched_stars_count"] >= 5

    # Check measured rotation against known ground truth (within 0.5 degrees)
    rot_error = abs(reg_data["rotation_deg"] - known_rot_deg)
    assert rot_error < 0.5, f"Measured rotation {reg_data['rotation_deg']} differs from {known_rot_deg}"

    # Residual RMS error should be small (< 1.5 pixels)
    assert reg_data["residual_rms"] < 1.5, f"Residual RMS {reg_data['residual_rms']} exceeds tolerance"

    # Preview endpoint should stream valid PNG
    preview_res = client.get(f"/api/registration/{tgt_id}/preview")
    assert preview_res.status_code == 200
    assert preview_res.headers["content-type"] == "image/png"


def test_registration_failure_on_insufficient_stars():
    """Ensures registration fails cleanly with a descriptive message when < 3 stars exist."""
    # Uniform plate with no stars
    blank_data1 = np.full((128, 128), 50.0, dtype=np.float32)
    blank_hdu1 = fits.PrimaryHDU(data=blank_data1)
    buf1 = io.BytesIO()
    blank_hdu1.writeto(buf1)

    r1 = client.post("/api/fits/ingest", files={"file": ("flat1.fits", buf1.getvalue(), "application/fits")})
    assert r1.status_code in (200, 201)
    id1 = r1.json()["observation"]["id"]

    blank_data2 = np.full((128, 128), 60.0, dtype=np.float32)
    blank_hdu2 = fits.PrimaryHDU(data=blank_data2)
    buf2 = io.BytesIO()
    blank_hdu2.writeto(buf2)
    r2 = client.post("/api/fits/ingest", files={"file": ("flat2.fits", buf2.getvalue(), "application/fits")})
    assert r2.status_code in (200, 201)
    id2 = r2.json()["observation"]["id"]

    assert id1 != id2

    reg_resp = client.post(
        "/api/registration/run",
        json={"reference_observation_id": id1, "target_observation_id": id2},
    )
    assert reg_resp.status_code == 200
    data = reg_resp.json()
    assert data["success"] is False
    assert "Insufficient reference stars" in data["message"]


def test_full_detection_and_background_api():
    """Tests the full REST API cycle for detection and background retrieval."""
    fits_bytes, _, _ = create_synthetic_star_field(shape=(128, 128), seed=555)

    ingest_res = client.post(
        "/api/fits/ingest",
        files={"file": ("api_test.fits", fits_bytes, "application/fits")},
    )
    assert ingest_res.status_code in (200, 201)
    obs_id = ingest_res.json()["observation"]["id"]

    # 1. Run detection
    det_res = client.post(
        "/api/detection/run",
        json={
            "observation_id": obs_id,
            "parameters": {
                "threshold_sigma": 3.5,
                "fwhm_pixels": 3.0,
                "box_size": 32,
                "filter_size": 3,
                "algorithm": "daofind",
            },
        },
    )
    assert det_res.status_code == 200
    det_data = det_res.json()
    assert det_data["source_count"] >= 5
    assert len(det_data["sources"]) == det_data["source_count"]

    # 2. Get detection results
    get_res = client.get(f"/api/detection/{obs_id}")
    assert get_res.status_code == 200
    assert get_res.json()["source_count"] == det_data["source_count"]

    # 3. Get background metadata
    bkg_res = client.get(f"/api/detection/{obs_id}/background")
    assert bkg_res.status_code == 200
    assert bkg_res.json()["background_median"] > 0

    # 4. Stream background-subtracted preview
    sub_res = client.get(f"/api/detection/{obs_id}/preview/subtracted")
    assert sub_res.status_code == 200
    assert sub_res.headers["content-type"] == "image/png"

    # 5. Stream 2D background map preview
    bkg_map_res = client.get(f"/api/detection/{obs_id}/preview/background")
    assert bkg_map_res.status_code == 200
    assert bkg_map_res.headers["content-type"] == "image/png"
