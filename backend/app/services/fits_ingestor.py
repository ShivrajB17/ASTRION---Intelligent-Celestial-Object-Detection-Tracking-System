"""ASTRION Scientific Engine — Advanced FITS Ingestion Service.

Implements production-quality FITS ingestion, automatic science-image HDU selection,
rigorous astrometric header extraction, NumPy/Astropy pixel distribution analysis,
and persistence management.
"""

from datetime import datetime, timezone
import hashlib
import math
import os
import re
from typing import Any, Dict, List, Optional, Tuple, Union
import uuid
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS
import astropy.wcs.utils as wcs_utils

from backend.app.config import settings
from backend.app.db.repository import observation_repo
from backend.app.models.fits import FitsDimensions, HduInfo
from backend.app.models.observation import ObservationRecord, PixelStatistics
from backend.app.services.image_renderer import ImageRendererService


class FitsIngestionService:
    """Authentic astronomical FITS ingestion and observation lifecycle management."""

    SUPPORTED_EXTENSIONS = (
        ".fits",
        ".fit",
        ".fts",
        ".fits.gz",
        ".fit.gz",
        ".fts.gz",
        ".fz",
        ".tar",
        ".tar.gz",
    )

    @classmethod
    def ingest_bytes(
        cls,
        file_bytes: bytes,
        filename: str,
        allow_duplicate: bool = False,
    ) -> Tuple[ObservationRecord, bool]:
        """Ingests FITS bytes, persists the source file and observation metadata.
        
        Returns:
            Tuple of (ObservationRecord, is_new: bool)
        """
        if not file_bytes:
            raise ValueError("Cannot ingest empty FITS file (0 bytes).")

        # 1. Calculate SHA-256 hash for deduplication
        hasher = hashlib.sha256()
        hasher.update(file_bytes)
        file_hash = hasher.hexdigest()

        # Check existing
        existing = observation_repo.get_by_hash(file_hash)
        if existing and existing.file_exists and not allow_duplicate:
            return existing, False

        # 2. Sanitize filename and create storage path
        obs_id = f"obs_{uuid.uuid4().hex[:12]}"
        safe_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", filename)
        file_path = os.path.join(settings.OBSERVATIONS_DIR, f"{obs_id}_{safe_name}")
        preview_path = os.path.join(settings.PREVIEWS_DIR, f"{obs_id}.png")

        # Write FITS payload to disk
        with open(file_path, "wb") as f:
            f.write(file_bytes)

        try:
            # 3. Analyze FITS file on disk with Astropy
            record = cls._analyze_and_record(
                file_path=file_path,
                obs_id=obs_id,
                filename=filename,
                file_size=len(file_bytes),
                file_hash=file_hash,
                preview_path=preview_path,
            )

            # 4. Persist in SQLite
            persisted = observation_repo.insert(record, file_path=file_path, preview_path=preview_path)
            return persisted, True
        except Exception:
            # Clean up files on analysis failure
            if os.path.exists(file_path):
                os.remove(file_path)
            if os.path.exists(preview_path):
                os.remove(preview_path)
            raise

    @classmethod
    def _analyze_and_record(
        cls,
        file_path: str,
        obs_id: str,
        filename: str,
        file_size: int,
        file_hash: str,
        preview_path: str,
    ) -> ObservationRecord:
        """Opens FITS with astropy.io.fits, selects science HDU, computes statistics and preview."""
        try:
            with fits.open(file_path, memmap=True) as hdul:
                total_hdus = len(hdul)
                if total_hdus == 0:
                    raise ValueError("FITS container contains no HDUs.")

                # Identify all HDUs summary
                hdus_info: List[HduInfo] = []
                for idx, hdu in enumerate(hdul):
                    h_name = str(getattr(hdu, "name", f"HDU_{idx}"))
                    h_type = type(hdu).__name__
                    h_shape = list(hdu.shape) if hasattr(hdu, "shape") and hdu.shape else None
                    h_bitpix = int(hdu.header["BITPIX"]) if hasattr(hdu, "header") and "BITPIX" in hdu.header else None
                    hdus_info.append(
                        HduInfo(
                            index=idx,
                            name=h_name,
                            hdu_type=h_type,
                            shape=h_shape,
                            bitpix=h_bitpix,
                        )
                    )

                # Automatic Science Image HDU Selection
                science_hdu_idx = cls._select_science_hdu(hdul)
                science_hdu = hdul[science_hdu_idx]
                primary_hdu = hdul[0]

                science_header = getattr(science_hdu, "header", fits.Header())
                primary_header = getattr(primary_hdu, "header", fits.Header())

                # Header metadata extraction (cascading from science HDU to primary HDU)
                date_obs = cls._get_str(science_header, ["DATE-OBS", "DATE_OBS", "DATE"]) or cls._get_str(primary_header, ["DATE-OBS", "DATE_OBS", "DATE"])
                exptime = cls._get_float(science_header, ["EXPTIME", "EXPOSURE", "TELAPSE"]) or cls._get_float(primary_header, ["EXPTIME", "EXPOSURE", "TELAPSE"])
                telescope = cls._get_str(science_header, ["TELESCOP", "TELESCOPE", "OBSERVAT"]) or cls._get_str(primary_header, ["TELESCOP", "TELESCOPE", "OBSERVAT"])
                instrument = cls._get_str(science_header, ["INSTRUME", "INSTRUMENT", "CAMERA", "DETECTOR"]) or cls._get_str(primary_header, ["INSTRUME", "INSTRUMENT", "CAMERA", "DETECTOR"])
                object_name = cls._get_str(science_header, ["OBJECT", "TARGNAME", "TARGET"]) or cls._get_str(primary_header, ["OBJECT", "TARGNAME", "TARGET"])
                filter_band = cls._get_str(science_header, ["FILTER", "FILTNAM", "BAND", "PASSBAND"]) or cls._get_str(primary_header, ["FILTER", "FILTNAM", "BAND", "PASSBAND"])
                equinox = cls._get_float(science_header, ["EQUINOX", "EPOCH"]) or cls._get_float(primary_header, ["EQUINOX", "EPOCH"])

                # Astrometry & WCS
                ra_deg, dec_deg = cls._extract_coordinates(science_header)
                if ra_deg is None and dec_deg is None and primary_header is not science_header:
                    ra_deg, dec_deg = cls._extract_coordinates(primary_header)

                wcs_available, pixel_scale = cls._evaluate_wcs(science_header)
                if not wcs_available and primary_header is not science_header:
                    wcs_available, pixel_scale = cls._evaluate_wcs(primary_header)

                # Dimensions & Data Type
                dimensions = cls._extract_dimensions(science_header)
                bitpix = cls._get_int(science_header, "BITPIX") or cls._get_int(primary_header, "BITPIX")
                
                data_arr = science_hdu.data
                dtype_str = getattr(data_arr.dtype, "name", str(data_arr.dtype)) if data_arr is not None else None

                # Pixel Statistics Analysis
                statistics = cls._compute_pixel_statistics(data_arr)

                # Generate Grayscale Scientific Preview
                has_preview = False
                if data_arr is not None and data_arr.ndim >= 2:
                    has_preview = ImageRendererService.render_preview_to_file(
                        data=data_arr,
                        output_path=preview_path,
                        stretch="zscale",
                    )

                # Comprehensive header summary
                headers_summary = cls._summarize_headers(primary_header)
                headers_summary.update(cls._summarize_headers(science_header))

                now_iso = datetime.now(timezone.utc).isoformat()

                return ObservationRecord(
                    id=obs_id,
                    filename=filename,
                    file_size_bytes=file_size,
                    file_hash=file_hash,
                    file_exists=True,
                    created_at=now_iso,
                    date_obs=date_obs,
                    exptime=exptime,
                    telescope=telescope,
                    instrument=instrument,
                    object_name=object_name,
                    filter_band=filter_band,
                    equinox=equinox,
                    ra_deg=ra_deg,
                    dec_deg=dec_deg,
                    wcs_available=wcs_available,
                    pixel_scale_arcsec=pixel_scale,
                    selected_hdu_index=science_hdu_idx,
                    selected_hdu_name=str(getattr(science_hdu, "name", f"HDU_{science_hdu_idx}")),
                    selected_hdu_type=type(science_hdu).__name__,
                    total_hdus=total_hdus,
                    hdus=hdus_info,
                    dimensions=dimensions,
                    bitpix=bitpix,
                    dtype=dtype_str,
                    statistics=statistics,
                    headers_summary=headers_summary,
                    ingestion_status="ingested",
                    has_preview=has_preview,
                    preview_url=f"/api/observations/{obs_id}/preview" if has_preview else None,
                )
        except (OSError, ValueError) as exc:
            raise ValueError(f"Failed to parse FITS data: {exc}") from exc

    @classmethod
    def _select_science_hdu(cls, hdul: fits.HDUList) -> int:
        """Selects the best science image HDU from the HDU list.
        
        Prioritizes:
        1. HDUs with 2D array data (or 3D with 1 plane).
        2. ImageHDU or CompImageHDU over empty PrimaryHDU.
        3. PrimaryHDU if it contains actual 2D image data.
        """
        best_idx = 0
        best_score = -1

        for idx, hdu in enumerate(hdul):
            data = getattr(hdu, "data", None)
            if data is None:
                continue

            shape = getattr(data, "shape", None)
            if not shape:
                continue

            score = 0
            hdu_class = type(hdu).__name__

            # Dimensionality assessment
            if len(shape) == 2 and shape[0] > 1 and shape[1] > 1:
                score += 100
            elif len(shape) == 3 and shape[0] in (1, 3):
                score += 80
            elif len(shape) >= 1:
                score += 20

            # Prefer extension image over empty primary
            if hdu_class in ("ImageHDU", "CompImageHDU"):
                score += 30
            elif hdu_class == "PrimaryHDU":
                score += 10

            # Favor HDUs explicitly named 'SCI', 'IMAGE', or 'DATA'
            name = str(getattr(hdu, "name", "")).upper()
            if any(k in name for k in ("SCI", "IMAGE", "PRIMARY", "DATA")):
                score += 20

            if score > best_score:
                best_score = score
                best_idx = idx

        return best_idx

    @classmethod
    def _compute_pixel_statistics(cls, data: Optional[np.ndarray]) -> PixelStatistics:
        """Computes statistical metrics (min, max, mean, median, std, valid/nan/inf counts).
        
        Strictly preserves original scientific pixel values without mutation.
        """
        if data is None or data.size == 0:
            return PixelStatistics()

        # Handle masked arrays
        if np.ma.is_masked(data):
            # Convert masked array to standard array with NaNs for masked positions
            raw = data.filled(np.nan)
        else:
            raw = data

        total_pixels = int(raw.size)

        # Count NaN and Inf
        is_nan = np.isnan(raw)
        is_inf = np.isinf(raw)
        nan_count = int(np.count_nonzero(is_nan))
        inf_count = int(np.count_nonzero(is_inf))
        
        is_finite = np.isfinite(raw)
        valid_count = int(np.count_nonzero(is_finite))

        if valid_count == 0:
            return PixelStatistics(
                min=None,
                max=None,
                mean=None,
                median=None,
                std=None,
                valid_pixels=0,
                nan_pixels=nan_count,
                inf_pixels=inf_count,
                total_pixels=total_pixels,
            )

        valid_data = raw[is_finite]

        # Calculate authentic metrics
        p_min = float(np.min(valid_data))
        p_max = float(np.max(valid_data))
        p_mean = float(np.mean(valid_data))
        p_std = float(np.std(valid_data))

        # Memory-safe median calculation: for very large images (>10M pixels),
        # use strided subsample to avoid memory exhaustion
        if valid_data.size > 10_000_000:
            step = valid_data.size // 2_000_000
            p_median = float(np.median(valid_data[::step]))
        else:
            p_median = float(np.median(valid_data))

        return PixelStatistics(
            min=round(p_min, 6),
            max=round(p_max, 6),
            mean=round(p_mean, 6),
            median=round(p_median, 6),
            std=round(p_std, 6),
            valid_pixels=valid_count,
            nan_pixels=nan_count,
            inf_pixels=inf_count,
            total_pixels=total_pixels,
        )

    @classmethod
    def _extract_dimensions(cls, header: fits.Header) -> Optional[FitsDimensions]:
        naxis = cls._get_int(header, "NAXIS")
        if naxis is None:
            return None

        width = cls._get_int(header, "NAXIS1")
        height = cls._get_int(header, "NAXIS2")
        depth = cls._get_int(header, "NAXIS3") if naxis >= 3 else None

        return FitsDimensions(
            naxis=naxis,
            width=width,
            height=height,
            depth=depth,
        )

    @classmethod
    def _extract_coordinates(cls, header: fits.Header) -> Tuple[Optional[float], Optional[float]]:
        ra = cls._get_float(header, ["RA", "RA_DEG", "CRVAL1", "OBJRA"])
        dec = cls._get_float(header, ["DEC", "DEC_DEG", "CRVAL2", "OBJDEC"])

        if ra is not None and not (0.0 <= ra <= 360.0):
            ra = None
        if dec is not None and not (-90.0 <= dec <= 90.0):
            dec = None

        return ra, dec

    @classmethod
    def _evaluate_wcs(cls, header: fits.Header) -> Tuple[bool, Optional[float]]:
        try:
            w = WCS(header, relax=True)
            if not w.is_celestial:
                return False, None

            try:
                scales = wcs_utils.proj_plane_pixel_scales(w)
                scale_deg = float(np.mean(scales))
                if scale_deg > 0 and not math.isnan(scale_deg):
                    pixel_scale_arcsec = round(scale_deg * 3600.0, 4)
                    return True, pixel_scale_arcsec
            except Exception:
                pass

            return True, None
        except Exception:
            return False, None

    @classmethod
    def _summarize_headers(cls, header: fits.Header) -> Dict[str, Any]:
        important_keys = [
            "SIMPLE", "BITPIX", "NAXIS", "NAXIS1", "NAXIS2",
            "DATE-OBS", "EXPTIME", "TELESCOP", "INSTRUME", "OBJECT",
            "FILTER", "EQUINOX", "CRVAL1", "CRVAL2", "CRPIX1", "CRPIX2",
            "CTYPE1", "CTYPE2", "CDELT1", "CDELT2", "CD1_1", "CD1_2",
            "CD2_1", "CD2_2", "BZERO", "BSCALE", "OBSERVER",
        ]
        summary: Dict[str, Any] = {}
        for key in important_keys:
            if key in header:
                val = header[key]
                if isinstance(val, (str, int, bool)):
                    summary[key] = val
                elif isinstance(val, float):
                    summary[key] = round(val, 6) if not math.isnan(val) else None
                else:
                    summary[key] = str(val)
        return summary

    @staticmethod
    def _get_str(header: fits.Header, keys: Union[str, List[str]]) -> Optional[str]:
        if isinstance(keys, str):
            keys = [keys]
        for k in keys:
            if k in header:
                val = str(header[k]).strip()
                if val:
                    return val
        return None

    @staticmethod
    def _get_float(header: fits.Header, keys: Union[str, List[str]]) -> Optional[float]:
        if isinstance(keys, str):
            keys = [keys]
        for k in keys:
            if k in header:
                try:
                    val = float(header[k])
                    if not math.isnan(val) and not math.isinf(val):
                        return round(val, 6)
                except (ValueError, TypeError):
                    continue
        return None

    @staticmethod
    def _get_int(header: fits.Header, keys: Union[str, List[str]]) -> Optional[int]:
        if isinstance(keys, str):
            keys = [keys]
        for k in keys:
            if k in header:
                try:
                    return int(header[k])
                except (ValueError, TypeError):
                    continue
        return None
