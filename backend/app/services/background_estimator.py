"""ASTRION Scientific Engine — 2D Background Estimation Service.

Implements robust 2D astronomical background and noise floor modeling
using Photutils Background2D, sigma-clipping, and graceful degradation
for small or uniform plates. Preserves raw observation arrays.
"""

import math
from typing import Optional, Tuple
from astropy.stats import SigmaClip, sigma_clipped_stats
import numpy as np
from photutils.background import Background2D, MedianBackground, StdBackgroundRMS


class BackgroundEstimationResult:
    """Container for computed background modeling arrays and scalars."""

    def __init__(
        self,
        background_map: np.ndarray,
        background_rms_map: np.ndarray,
        background_subtracted: np.ndarray,
        background_median: float,
        background_rms: float,
        box_size: int,
        filter_size: int,
    ):
        self.background_map = background_map
        self.background_rms_map = background_rms_map
        self.background_subtracted = background_subtracted
        self.background_median = background_median
        self.background_rms = background_rms
        self.box_size = box_size
        self.filter_size = filter_size


class BackgroundEstimatorService:
    """Scientific 2D background and noise floor estimation engine."""

    @classmethod
    def estimate_background(
        cls,
        data: np.ndarray,
        box_size: int = 64,
        filter_size: int = 3,
        sigma_clip_val: float = 3.0,
    ) -> BackgroundEstimationResult:
        """Estimates 2D background and noise variance across an astronomical image.
        
        Handles NaNs, infinite pixels, masked arrays, and images smaller than box_size.
        Never mutates the input array.
        """
        if data is None or data.size == 0 or data.ndim < 2:
            raise ValueError("Input array must be a valid 2D image.")

        # Ensure 2D float32 representation
        arr = np.squeeze(data).astype(np.float32, copy=True)
        if arr.ndim != 2:
            raise ValueError(f"Expected 2D array, got shape {arr.shape}")

        height, width = arr.shape
        coverage_mask = ~np.isfinite(arr)

        # Check if enough finite pixels exist
        valid_count = np.count_nonzero(~coverage_mask)
        if valid_count < 9:
            # Degenerate image -> fallback to uniform 0 background and 1 noise
            bkg_map = np.zeros_like(arr)
            rms_map = np.ones_like(arr)
            sub = arr - bkg_map
            return BackgroundEstimationResult(
                background_map=bkg_map,
                background_rms_map=rms_map,
                background_subtracted=sub,
                background_median=0.0,
                background_rms=1.0,
                box_size=box_size,
                filter_size=filter_size,
            )

        # Adapt box_size if image is smaller than requested box_size * 2
        effective_box_h = min(box_size, max(4, height // 2))
        effective_box_w = min(box_size, max(4, width // 2))
        bkg_box = (effective_box_h, effective_box_w)
        bkg_filter = (min(filter_size, effective_box_h), min(filter_size, effective_box_w))

        # Attempt full 2D Mesh Background estimation via Photutils
        try:
            bkg_estimator = MedianBackground()
            bkgrms_estimator = StdBackgroundRMS()
            sigma_clip = SigmaClip(sigma=sigma_clip_val, maxiters=5)

            # If coverage_mask has any invalid pixels, supply mask
            mask_arg = coverage_mask if np.any(coverage_mask) else None

            bkg2d = Background2D(
                data=arr,
                box_size=bkg_box,
                filter_size=bkg_filter,
                sigma_clip=sigma_clip,
                bkg_estimator=bkg_estimator,
                bkg_rms_estimator=bkgrms_estimator,
                mask=mask_arg,
                fill_value=0.0,
            )

            bkg_map = bkg2d.background.astype(np.float32)
            rms_map = bkg2d.background_rms.astype(np.float32)
            bkg_median = float(bkg2d.background_median)
            bkg_rms = float(bkg2d.background_rms_median)

            # Guard against NaN/zero noise
            if math.isnan(bkg_rms) or bkg_rms <= 0.0:
                bkg_rms = 1.0

        except Exception:
            # Fallback for plates with insufficient unmasked grid boxes
            bkg_map, rms_map, bkg_median, bkg_rms = cls._fallback_sigma_clipped_stats(
                arr, coverage_mask, sigma_clip_val
            )

        # Background-subtracted image (preserving raw original)
        subtracted = arr - bkg_map
        subtracted[coverage_mask] = 0.0

        return BackgroundEstimationResult(
            background_map=bkg_map,
            background_rms_map=rms_map,
            background_subtracted=subtracted,
            background_median=round(bkg_median, 4),
            background_rms=round(bkg_rms, 4),
            box_size=effective_box_w,
            filter_size=bkg_filter[0],
        )

    @classmethod
    def _fallback_sigma_clipped_stats(
        cls,
        arr: np.ndarray,
        mask: np.ndarray,
        sigma: float,
    ) -> Tuple[np.ndarray, np.ndarray, float, float]:
        """Global sigma-clipped statistics fallback for small or noisy images."""
        valid_vals = arr[~mask]
        mean_val, median_val, std_val = sigma_clipped_stats(valid_vals, sigma=sigma, maxiters=5)

        bkg_median = float(median_val) if not math.isnan(median_val) else 0.0
        bkg_rms = float(std_val) if not math.isnan(std_val) and std_val > 0.0 else 1.0

        bkg_map = np.full_like(arr, bkg_median, dtype=np.float32)
        rms_map = np.full_like(arr, bkg_rms, dtype=np.float32)

        return bkg_map, rms_map, bkg_median, bkg_rms
