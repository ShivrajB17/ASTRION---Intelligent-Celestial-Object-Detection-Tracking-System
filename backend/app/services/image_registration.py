"""ASTRION Scientific Engine — Image Registration Service.

Implements authentic multi-epoch astronomical plate alignment using star-based
invariant triangle matching (Astroalign) and RANSAC SimilarityTransform estimation.
Calculates rotation, translation, scale factor, and residual RMS alignment errors.
Preserves original observations and stores registered outputs separately.
"""

from datetime import datetime, timezone
import math
import os
import time
from typing import Optional, Tuple
import astroalign
from astropy.io import fits
import numpy as np
from photutils.detection import DAOStarFinder
from skimage.transform import SimilarityTransform, warp

from backend.app.config import settings
from backend.app.db.repository import observation_repo
from backend.app.models.registration import RegistrationResponse
from backend.app.services.background_estimator import BackgroundEstimatorService
from backend.app.services.fits_ingestor import FitsIngestionService
from backend.app.services.image_renderer import ImageRendererService


class ImageRegistrationService:
    """Scientific multi-epoch astronomical image alignment and distortion estimation engine."""

    @classmethod
    def register_observations(
        cls,
        reference_obs_id: str,
        target_obs_id: str,
    ) -> RegistrationResponse:
        """Registers a target observation against a reference observation using real star alignment.
        
        Never mutates or overwrites the original FITS files.
        """
        run_id = f"reg_{int(time.time() * 1000)}"
        now_iso = datetime.now(timezone.utc).isoformat()

        if reference_obs_id == target_obs_id:
            return RegistrationResponse(
                run_id=run_id,
                reference_observation_id=reference_obs_id,
                target_observation_id=target_obs_id,
                success=True,
                rotation_deg=0.0,
                translation_x=0.0,
                translation_y=0.0,
                scale=1.0,
                residual_rms=0.0,
                matched_stars_count=0,
                transformation_matrix=[[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
                registered_preview_url=f"/api/observations/{target_obs_id}/preview",
                message="Target observation is identical to reference observation (identity transform).",
            )

        # 1. Load 2D arrays and headers for both observations
        try:
            ref_data, ref_header, ref_obs = FitsIngestionService.load_observation_data_and_header(reference_obs_id)
            tgt_data, tgt_header, tgt_obs = FitsIngestionService.load_observation_data_and_header(target_obs_id)
        except Exception as exc:
            return RegistrationResponse(
                run_id=run_id,
                reference_observation_id=reference_obs_id,
                target_observation_id=target_obs_id,
                success=False,
                message=f"Failed to load observation data: {exc}",
            )

        # 2. Extract reliable reference stars from both plates
        ref_stars, ref_bkg_rms = cls._extract_reference_stars(ref_data)
        tgt_stars, tgt_bkg_rms = cls._extract_reference_stars(tgt_data)

        # 3. Check minimum reference star requirement (requirement #8: Flag insufficient reference sources)
        if len(ref_stars) < 3 or len(tgt_stars) < 3:
            msg = (
                f"Insufficient reference stars detected: reference frame has {len(ref_stars)} stars, "
                f"target frame has {len(tgt_stars)} stars (minimum 3 required for astrometric alignment)."
            )
            observation_repo.save_registration_run(
                run_id=run_id,
                reference_observation_id=reference_obs_id,
                target_observation_id=target_obs_id,
                created_at=now_iso,
                success=False,
                rotation_deg=0.0,
                translation_x=0.0,
                translation_y=0.0,
                scale=1.0,
                residual_rms=0.0,
                matched_stars_count=0,
                transformation_matrix=[],
                message=msg,
            )
            return RegistrationResponse(
                run_id=run_id,
                reference_observation_id=reference_obs_id,
                target_observation_id=target_obs_id,
                success=False,
                message=msg,
            )

        # 4. Estimate Transformation using Astroalign or Point-Set Matching
        transform = None
        matched_count = 0
        residual_rms = 0.0

        # Attempt A: Point-set triangle matching via astroalign
        try:
            t, (src_matches, tgt_matches) = astroalign.find_transform(tgt_stars, ref_stars)
            transform = t
            matched_count = len(src_matches)
            if matched_count > 0:
                mapped_pts = transform(src_matches)
                residuals = np.sqrt(np.sum((mapped_pts - tgt_matches) ** 2, axis=1))
                residual_rms = float(np.sqrt(np.mean(residuals ** 2)))
        except Exception:
            transform = None

        # Attempt B: Direct full-image registration via astroalign if point-set had triangle matching issues
        if transform is None:
            try:
                t, (src_matches, tgt_matches) = astroalign.find_transform(tgt_data, ref_data)
                transform = t
                matched_count = len(src_matches) if src_matches is not None else 0
                if matched_count > 0:
                    mapped_pts = transform(src_matches)
                    residuals = np.sqrt(np.sum((mapped_pts - tgt_matches) ** 2, axis=1))
                    residual_rms = float(np.sqrt(np.mean(residuals ** 2)))
            except Exception:
                transform = None

        # If alignment could not be converged
        if transform is None:
            msg = "Registration failed to converge: unable to match star asterisms between observation epochs."
            observation_repo.save_registration_run(
                run_id=run_id,
                reference_observation_id=reference_obs_id,
                target_observation_id=target_obs_id,
                created_at=now_iso,
                success=False,
                rotation_deg=0.0,
                translation_x=0.0,
                translation_y=0.0,
                scale=1.0,
                residual_rms=0.0,
                matched_stars_count=0,
                transformation_matrix=[],
                message=msg,
            )
            return RegistrationResponse(
                run_id=run_id,
                reference_observation_id=reference_obs_id,
                target_observation_id=target_obs_id,
                success=False,
                message=msg,
            )

        # 5. Extract transformation metrics
        rotation_deg = float(np.degrees(getattr(transform, "rotation", 0.0)))
        translation = getattr(transform, "translation", (0.0, 0.0))
        translation_x = float(translation[0])
        translation_y = float(translation[1])
        scale = float(getattr(transform, "scale", 1.0))
        matrix = transform.params.tolist() if hasattr(transform, "params") else []

        # 6. Warp target image onto reference frame grid (preserve original FITS file)
        try:
            # Warp using inverse transform onto reference image shape
            aligned_array = warp(
                tgt_data,
                transform.inverse,
                output_shape=ref_data.shape,
                order=1,
                mode="constant",
                cval=0.0,
                preserve_range=True,
            ).astype(np.float32)
        except Exception:
            # Fallback to astroalign.apply_transform
            aligned_array = astroalign.apply_transform(transform, tgt_data, ref_data)[0].astype(np.float32)

        # 7. Persist registered FITS file and preview PNG
        registered_fits_filename = f"registered_{target_obs_id}_to_{reference_obs_id}.fits"
        registered_fits_path = os.path.join(settings.REGISTERED_DIR, registered_fits_filename)

        # Update FITS header with alignment metadata
        out_header = tgt_header.copy()
        out_header["REG_REF"] = (reference_obs_id[:20], "Registration reference observation ID")
        out_header["REG_ROT"] = (round(rotation_deg, 4), "Registration rotation angle in degrees")
        out_header["REG_DX"] = (round(translation_x, 4), "Registration X translation in pixels")
        out_header["REG_DY"] = (round(translation_y, 4), "Registration Y translation in pixels")
        out_header["REG_RMS"] = (round(residual_rms, 4), "Registration residual RMS in pixels")
        out_header["REG_NSTR"] = (matched_count, "Matched reference stars count")

        fits.writeto(registered_fits_path, aligned_array, out_header, overwrite=True)

        registered_preview_filename = f"registered_{target_obs_id}.png"
        registered_preview_path = os.path.join(settings.PREVIEWS_DIR, registered_preview_filename)
        ImageRendererService.render_preview_to_file(aligned_array, registered_preview_path, stretch="zscale")
        registered_preview_url = f"/api/registration/{target_obs_id}/preview"

        success_msg = (
            f"Successfully aligned observation with {matched_count} matched reference stars. "
            f"Rotation: {rotation_deg:.3f}°, Translation: ({translation_x:.2f}, {translation_y:.2f}) px, "
            f"Residual RMS: {residual_rms:.3f} px."
        )

        observation_repo.save_registration_run(
            run_id=run_id,
            reference_observation_id=reference_obs_id,
            target_observation_id=target_obs_id,
            created_at=now_iso,
            success=True,
            rotation_deg=round(rotation_deg, 4),
            translation_x=round(translation_x, 4),
            translation_y=round(translation_y, 4),
            scale=round(scale, 4),
            residual_rms=round(residual_rms, 4),
            matched_stars_count=matched_count,
            transformation_matrix=matrix,
            registered_fits_path=registered_fits_path,
            registered_preview_path=registered_preview_path,
            message=success_msg,
        )

        return RegistrationResponse(
            run_id=run_id,
            reference_observation_id=reference_obs_id,
            target_observation_id=target_obs_id,
            success=True,
            rotation_deg=round(rotation_deg, 4),
            translation_x=round(translation_x, 4),
            translation_y=round(translation_y, 4),
            scale=round(scale, 4),
            residual_rms=round(residual_rms, 4),
            matched_stars_count=matched_count,
            transformation_matrix=matrix,
            registered_preview_url=registered_preview_url,
            message=success_msg,
        )

    @classmethod
    def _extract_reference_stars(cls, data: np.ndarray) -> Tuple[np.ndarray, float]:
        """Detects bright stellar reference coordinates for triangulation."""
        bkg_res = BackgroundEstimatorService.estimate_background(data, box_size=64, filter_size=3)
        bkg_sub = bkg_res.background_subtracted
        bkg_rms = bkg_res.background_rms

        threshold = max(1.0, 3.5 * bkg_rms)
        finder = DAOStarFinder(threshold=threshold, fwhm=3.0)

        try:
            tbl = finder(bkg_sub)
            if tbl is not None and len(tbl) > 0:
                # Sort by peak intensity descending and keep up to 100 brightest reliable stars
                if "peak" in tbl.colnames:
                    tbl.sort("peak", reverse=True)
                top_tbl = tbl[:100]
                xcol = "x_centroid" if "x_centroid" in top_tbl.colnames else "xcentroid"
                ycol = "y_centroid" if "y_centroid" in top_tbl.colnames else "ycentroid"
                pts = np.column_stack([top_tbl[xcol], top_tbl[ycol]]).astype(np.float64)
                return pts, bkg_rms
        except Exception:
            pass

        return np.empty((0, 2), dtype=np.float64), bkg_rms
