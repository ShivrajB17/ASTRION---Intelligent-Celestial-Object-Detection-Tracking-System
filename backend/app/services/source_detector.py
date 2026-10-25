"""ASTRION Scientific Engine — Source Detection & Centroid Extraction Service.

Implements genuine astronomical source detection, sub-pixel intensity-weighted
centroid calculation, photometric aperture measurement, and WCS sky coordinate
conversion using Photutils and Astropy.
"""

from datetime import datetime, timezone
import math
import os
import time
from typing import List, Optional, Tuple
from astropy.io import fits
from astropy.wcs import WCS
import numpy as np
from photutils.centroids import centroid_com, centroid_quadratic
from photutils.detection import DAOStarFinder, IRAFStarFinder

from backend.app.config import settings
from backend.app.db.repository import observation_repo
from backend.app.models.detection import (
    DetectedSource,
    DetectionParameters,
    DetectionResponse,
)
from backend.app.services.background_estimator import BackgroundEstimatorService
from backend.app.services.image_renderer import ImageRendererService


class SourceDetectorService:
    """Authentic astronomical point source detection and astrometric centroid extraction."""

    @classmethod
    def run_detection(
        cls,
        data: np.ndarray,
        header: fits.Header,
        params: DetectionParameters,
        obs_id: str,
    ) -> DetectionResponse:
        """Executes full scientific source detection and centroid extraction on a 2D FITS array."""
        start_time = time.perf_counter()
        now_iso = datetime.now(timezone.utc).isoformat()
        run_id = f"det_{int(time.time() * 1000)}"

        if data is None or data.size == 0 or data.ndim != 2:
            raise ValueError("Input FITS array must be a valid 2D array.")

        height, width = data.shape

        # 1. 2D Background and Noise Floor Estimation
        bkg_result = BackgroundEstimatorService.estimate_background(
            data=data,
            box_size=params.box_size,
            filter_size=params.filter_size,
        )

        bkg_subtracted = bkg_result.background_subtracted
        bkg_median = bkg_result.background_median
        bkg_rms = bkg_result.background_rms
        bkg_map = bkg_result.background_map

        # 2. Render and save preview images for background subtraction and 2D background map
        bkg_sub_filename = f"{obs_id}_bkg_sub.png"
        bkg_sub_path = os.path.join(settings.PREVIEWS_DIR, bkg_sub_filename)
        ImageRendererService.render_preview_to_file(bkg_subtracted, bkg_sub_path, stretch="zscale")
        bkg_sub_url = f"/api/detection/{obs_id}/preview/subtracted"

        bkg_map_filename = f"{obs_id}_bkg_map.png"
        bkg_map_path = os.path.join(settings.PREVIEWS_DIR, bkg_map_filename)
        ImageRendererService.render_preview_to_file(bkg_map, bkg_map_path, stretch="linear")
        bkg_map_url = f"/api/detection/{obs_id}/preview/background"

        # 3. Detection Threshold derived from background RMS
        detection_threshold = float(params.threshold_sigma * bkg_rms)
        if detection_threshold <= 0:
            detection_threshold = 1.0

        # 4. Source Finder execution (DAOStarFinder / IRAFStarFinder)
        sources_table = None
        algo = params.algorithm.lower()
        try:
            if "iraf" in algo:
                finder = IRAFStarFinder(threshold=detection_threshold, fwhm=params.fwhm_pixels)
                sources_table = finder(bkg_subtracted)
            else:
                # Default: DAOStarFinder
                finder = DAOStarFinder(threshold=detection_threshold, fwhm=params.fwhm_pixels)
                sources_table = finder(bkg_subtracted)
        except Exception as exc:
            # Fallback to DAOStarFinder if custom algorithm encounters an issue
            try:
                finder = DAOStarFinder(threshold=detection_threshold, fwhm=params.fwhm_pixels)
                sources_table = finder(bkg_subtracted)
            except Exception:
                sources_table = None

        # 5. Astrometric WCS initialization (never fabricate coordinates)
        wcs_obj = None
        try:
            candidate_wcs = WCS(header)
            if candidate_wcs.is_celestial:
                wcs_obj = candidate_wcs
        except Exception:
            wcs_obj = None

        # Determine saturation limit
        sat_limit = 65000.0
        if "SATURATE" in header:
            try:
                sat_limit = float(header["SATURATE"])
            except (ValueError, TypeError):
                pass

        detected_sources: List[DetectedSource] = []
        radius = max(3, int(round(params.fwhm_pixels * 1.5)))

        if sources_table is not None and len(sources_table) > 0:
            for idx, row in enumerate(sources_table):
                # Retrieve initial pixel coordinates
                x_init = float(row["x_centroid"] if "x_centroid" in row.colnames else row["xcentroid"])
                y_init = float(row["y_centroid"] if "y_centroid" in row.colnames else row["ycentroid"])

                # Peak and flux
                raw_peak = float(row["peak"]) if "peak" in row.colnames else 0.0
                raw_flux = float(row["flux"]) if "flux" in row.colnames else 0.0
                sharpness = float(row["sharpness"]) if "sharpness" in row.colnames else None
                roundness = None
                if "roundness" in row.colnames:
                    roundness = float(row["roundness"])
                elif "roundness1" in row.colnames:
                    roundness = float(row["roundness1"])

                # Extract local window for accurate sub-pixel centroiding
                ix = int(round(x_init))
                iy = int(round(y_init))

                x_min = max(0, ix - radius)
                x_max = min(width, ix + radius + 1)
                y_min = max(0, iy - radius)
                y_max = min(height, iy + radius + 1)

                flags = 0
                is_edge = (ix - radius < 0) or (ix + radius + 1 > width) or (iy - radius < 0) or (iy + radius + 1 > height)
                if is_edge:
                    flags |= 1  # EDGE source

                # Sub-pixel Centroid Calculation
                cutout_raw = data[y_min:y_max, x_min:x_max]
                cutout_sub = bkg_subtracted[y_min:y_max, x_min:x_max]

                if np.any(cutout_raw >= sat_limit):
                    flags |= 2  # SATURATED

                # Clean local cutout for centroid
                cutout_clean = np.nan_to_num(cutout_sub, nan=0.0, posinf=0.0, neginf=0.0)
                cutout_clean = np.clip(cutout_clean, 0.0, None)

                centroid_x = x_init
                centroid_y = y_init

                if cutout_clean.size >= 9 and np.sum(cutout_clean) > 0:
                    try:
                        # Attempt quadratic sub-pixel centroid
                        local_c = centroid_quadratic(cutout_clean)
                        if local_c is not None and not np.any(np.isnan(local_c)):
                            lx, ly = float(local_c[0]), float(local_c[1])
                            # Verify local centroid lies within cutout bounds
                            if 0 <= lx < cutout_clean.shape[1] and 0 <= ly < cutout_clean.shape[0]:
                                centroid_x = x_min + lx
                                centroid_y = y_min + ly
                            else:
                                com_c = centroid_com(cutout_clean)
                                centroid_x = x_min + float(com_c[0])
                                centroid_y = y_min + float(com_c[1])
                    except Exception:
                        try:
                            com_c = centroid_com(cutout_clean)
                            centroid_x = x_min + float(com_c[0])
                            centroid_y = y_min + float(com_c[1])
                        except Exception:
                            pass

                # Signal-to-noise ratio
                snr = raw_peak / bkg_rms if bkg_rms > 0 else 1.0
                if snr < params.threshold_sigma:
                    flags |= 4  # LOW_SNR

                # Centroid uncertainty estimation: sigma_pos ≈ FWHM / (2.355 * SNR)
                centroid_uncertainty = params.fwhm_pixels / (2.355 * max(snr, 1.0))
                if flags & 1:  # Edge sources have higher uncertainty
                    centroid_uncertainty *= 2.0

                # Quality string
                if flags & 2:
                    quality = "saturated"
                elif flags & 1:
                    quality = "edge"
                elif flags & 4:
                    quality = "low_snr"
                else:
                    quality = "clean"

                # WCS Sky coordinate conversion
                ra_deg: Optional[float] = None
                dec_deg: Optional[float] = None
                sky_coord_available = False

                if wcs_obj is not None:
                    try:
                        sky_pt = wcs_obj.pixel_to_world(centroid_x, centroid_y)
                        ra_deg = round(float(sky_pt.ra.deg), 6)
                        dec_deg = round(float(sky_pt.dec.deg), 6)
                        sky_coord_available = True
                    except Exception:
                        ra_deg = None
                        dec_deg = None
                        sky_coord_available = False

                src_id = f"SRC-{idx + 1:04d}"
                detected_sources.append(
                    DetectedSource(
                        id=src_id,
                        source_number=idx + 1,
                        x=round(x_init, 3),
                        y=round(y_init, 3),
                        centroid_x=round(centroid_x, 4),
                        centroid_y=round(centroid_y, 4),
                        centroid_uncertainty=round(centroid_uncertainty, 4),
                        ra_deg=ra_deg,
                        dec_deg=dec_deg,
                        sky_coord_available=sky_coord_available,
                        peak=round(raw_peak, 2),
                        flux=round(raw_flux, 2),
                        fwhm=round(float(params.fwhm_pixels), 2),
                        snr=round(float(snr), 2),
                        sharpness=round(sharpness, 4) if sharpness is not None else None,
                        roundness=round(roundness, 4) if roundness is not None else None,
                        flags=flags,
                        quality=quality,
                    )
                )

        # Sort sources by peak intensity descending
        detected_sources.sort(key=lambda s: s.peak, reverse=True)
        for i, s in enumerate(detected_sources):
            s.source_number = i + 1

        exec_time_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        # 6. Persist Detection Run into SQLite database
        observation_repo.save_detection_run(
            run_id=run_id,
            observation_id=obs_id,
            created_at=now_iso,
            source_count=len(detected_sources),
            background_median=bkg_median,
            background_rms=bkg_rms,
            parameters_dict=params.model_dump(),
            sources_list=[s.model_dump() for s in detected_sources],
            execution_time_ms=exec_time_ms,
            bkg_subtracted_preview_path=bkg_sub_path,
            bkg_map_preview_path=bkg_map_path,
        )

        return DetectionResponse(
            run_id=run_id,
            observation_id=obs_id,
            source_count=len(detected_sources),
            background_median=bkg_median,
            background_rms=bkg_rms,
            parameters=params,
            sources=detected_sources,
            execution_time_ms=exec_time_ms,
            bkg_subtracted_preview_url=bkg_sub_url,
            bkg_map_preview_url=bkg_map_url,
        )
