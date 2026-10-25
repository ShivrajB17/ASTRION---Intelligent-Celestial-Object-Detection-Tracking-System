"""ASTRION Scientific Engine — Image Renderer Service.

Normalizes and renders astronomical 2D FITS data arrays into high-fidelity
grayscale previews using Astropy visualization stretch algorithms and Pillow.
Preserves underlying scientific data without mutation.
"""

import io
import math
import os
from typing import Optional, Tuple
import numpy as np
from PIL import Image
from astropy.visualization import AsinhStretch, PercentileInterval, ZScaleInterval


class ImageRendererService:
    """Renders 2D FITS image arrays into web-ready scientific preview images."""

    MAX_PREVIEW_DIMENSION = 1024

    @classmethod
    def render_preview_to_file(
        cls,
        data: np.ndarray,
        output_path: str,
        stretch: str = "zscale",
    ) -> bool:
        """Normalizes and writes a 2D FITS data array to a PNG file."""
        png_bytes = cls.render_preview(data, stretch=stretch)
        if png_bytes is None:
            return False

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(png_bytes)
        return True

    @classmethod
    def render_preview(
        cls,
        data: np.ndarray,
        stretch: str = "zscale",
    ) -> Optional[bytes]:
        """Normalizes a 2D numpy array to 8-bit grayscale PNG bytes.
        
        Handles NaNs, infinities, masked arrays, and dynamic contrast ranges.
        """
        if data is None or data.size == 0 or data.ndim < 2:
            return None

        # Squeeze or take first 2D slice if 3D with 1 channel
        arr = np.squeeze(data)
        if arr.ndim == 3:
            arr = arr[0, :, :]
        if arr.ndim != 2:
            return None

        # Mask invalid values
        valid_mask = np.isfinite(arr)
        if not np.any(valid_mask):
            # All pixels are NaN or Inf -> generate blank black image
            img = Image.new("L", (min(arr.shape[1], 256), min(arr.shape[0], 256)), color=0)
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            return buf.getvalue()

        # Compute stretch limits using Astropy intervals
        vmin, vmax = cls._compute_stretch_limits(arr, valid_mask, stretch)

        # Normalize to 0.0 - 1.0
        if vmax > vmin:
            scaled = (np.clip(arr, vmin, vmax) - vmin) / (vmax - vmin)
        else:
            scaled = np.zeros_like(arr, dtype=np.float32)

        # Handle NaNs / masked pixels -> set to black (0.0)
        scaled[~valid_mask] = 0.0

        # Convert to 8-bit unsigned integer (0 - 255)
        uint8_arr = (np.clip(scaled, 0.0, 1.0) * 255.0).astype(np.uint8)

        # FITS coordinates: row 0 is at bottom (standard astronomical convention).
        # We invert vertically so North is up when displayed in standard web img tags.
        uint8_arr = np.flipud(uint8_arr)

        img = Image.fromarray(uint8_arr, mode="L")

        # Downsample if image is exceptionally large for fast web transmission
        h, w = img.size[1], img.size[0]
        if max(h, w) > cls.MAX_PREVIEW_DIMENSION:
            scale = cls.MAX_PREVIEW_DIMENSION / float(max(h, w))
            new_w = max(1, int(w * scale))
            new_h = max(1, int(h * scale))
            img = img.resize((new_w, new_h), Image.Resampling.BILINEAR)

        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        return buf.getvalue()

    @staticmethod
    def _compute_stretch_limits(
        arr: np.ndarray,
        valid_mask: np.ndarray,
        stretch: str,
    ) -> Tuple[float, float]:
        """Calculates display contrast limits using ZScale or Percentile."""
        valid_data = arr[valid_mask]
        
        try:
            if stretch.lower() == "zscale":
                interval = ZScaleInterval(contrast=0.25)
                vmin, vmax = interval.get_limits(valid_data)
                if not (math.isnan(vmin) or math.isnan(vmax)) and vmax > vmin:
                    return float(vmin), float(vmax)
        except Exception:
            pass

        # Fallback to 99.5% percentile interval
        try:
            interval = PercentileInterval(99.5)
            vmin, vmax = interval.get_limits(valid_data)
            if not (math.isnan(vmin) or math.isnan(vmax)) and vmax > vmin:
                return float(vmin), float(vmax)
        except Exception:
            pass

        # Final min-max fallback
        vmin = float(np.min(valid_data))
        vmax = float(np.max(valid_data))
        return vmin, vmax
