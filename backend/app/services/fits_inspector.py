"""ASTRION Scientific Engine — Genuine FITS Inspection Service.

Inspects FITS headers and HDU topologies using astropy.io.fits and astropy.wcs.
Never manufactures missing metadata. Strictly respects memory limits.
"""

import io
import math
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS
import astropy.wcs.utils as wcs_utils

from backend.app.models.fits import (
    FitsDimensions,
    FitsInspectionResponse,
    HduInfo,
    SupportedFormatsResponse,
)


class FitsInspectorService:
    """Service for authentic astronomical FITS inspection and metadata extraction."""

    SUPPORTED_EXTENSIONS = [
        ".fits",
        ".fit",
        ".fts",
        ".fits.gz",
        ".fit.gz",
        ".fts.gz",
        ".tar",
        ".tar.gz",
    ]

    @classmethod
    def get_supported_formats(cls) -> SupportedFormatsResponse:
        """Returns officially supported FITS extensions and compression options."""
        return SupportedFormatsResponse(
            extensions=cls.SUPPORTED_EXTENSIONS,
            compression=["GZIP (.gz)", "FITS Tile Compression (fpack/funpack)"],
            description=(
                "Standard Flexible Image Transport System (FITS) files compliant with "
                "IAU FITS Standard 4.0, including multi-extension FITS (MEF), "
                "bintables, and gzipped streams."
            ),
        )

    @classmethod
    def inspect_file(
        cls,
        file_bytes: bytes,
        filename: str = "observation.fits",
    ) -> FitsInspectionResponse:
        """Inspects in-memory FITS bytes using astropy.io.fits without reading array payloads."""
        if not file_bytes:
            raise ValueError("FITS payload is empty.")

        file_size = len(file_bytes)
        buffer = io.BytesIO(file_bytes)

        try:
            # lazy_load_hdus=True avoids reading large data blocks
            with fits.open(buffer, memmap=False, lazy_load_hdus=True) as hdul:
                return cls._extract_metadata(hdul, filename, file_size)
        except Exception as exc:
            # Distinguish corrupt/non-FITS files
            raise ValueError(f"Failed to parse FITS data: {exc}") from exc

    @classmethod
    def inspect_path(cls, file_path: str) -> FitsInspectionResponse:
        """Inspects a local file path using astropy.io.fits with memory mapping."""
        import os

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        file_size = os.path.getsize(file_path)
        filename = os.path.basename(file_path)

        try:
            with fits.open(file_path, memmap=True, lazy_load_hdus=True) as hdul:
                return cls._extract_metadata(hdul, filename, file_size)
        except Exception as exc:
            raise ValueError(f"Failed to parse FITS at {file_path}: {exc}") from exc

    @classmethod
    def _extract_metadata(
        cls,
        hdul: fits.HDUList,
        filename: str,
        file_size: int,
    ) -> FitsInspectionResponse:
        """Extracts genuine astrometric and instrument headers across all HDUs."""
        hdu_count = len(hdul)
        hdus_info: List[HduInfo] = []

        # Find primary or first image HDU
        primary_hdu = hdul[0] if hdu_count > 0 else None
        image_hdu = None

        for idx, hdu in enumerate(hdul):
            name = str(getattr(hdu, "name", f"HDU_{idx}"))
            hdu_type = type(hdu).__name__

            shape = None
            if hasattr(hdu, "shape") and hdu.shape:
                shape = list(hdu.shape)

            bitpix = None
            if hasattr(hdu, "header") and "BITPIX" in hdu.header:
                bitpix = int(hdu.header["BITPIX"])

            hdus_info.append(
                HduInfo(
                    index=idx,
                    name=name,
                    hdu_type=hdu_type,
                    shape=shape,
                    bitpix=bitpix,
                )
            )

            # Identify the best image HDU for dimension & coordinate extraction
            if image_hdu is None and hdu_type in ("PrimaryHDU", "ImageHDU", "CompImageHDU"):
                if shape and len(shape) >= 2:
                    image_hdu = hdu

        if image_hdu is None and primary_hdu is not None:
            image_hdu = primary_hdu

        header = getattr(image_hdu, "header", fits.Header())
        primary_header = getattr(primary_hdu, "header", fits.Header())

        # Extract dimensions
        dimensions = cls._extract_dimensions(header)

        # Extract basic cards safely (checking image extension header first, then primary header)
        bitpix = cls._get_int(header, "BITPIX") or cls._get_int(primary_header, "BITPIX")
        date_obs = cls._get_str(header, ["DATE-OBS", "DATE_OBS", "DATE"]) or cls._get_str(primary_header, ["DATE-OBS", "DATE_OBS", "DATE"])
        exptime = cls._get_float(header, ["EXPTIME", "EXPOSURE", "TELAPSE"]) or cls._get_float(primary_header, ["EXPTIME", "EXPOSURE", "TELAPSE"])
        telescope = cls._get_str(header, ["TELESCOP", "TELESCOPE", "OBSERVAT"]) or cls._get_str(primary_header, ["TELESCOP", "TELESCOPE", "OBSERVAT"])
        instrument = cls._get_str(header, ["INSTRUME", "INSTRUMENT", "CAMERA", "DETECTOR"]) or cls._get_str(primary_header, ["INSTRUME", "INSTRUMENT", "CAMERA", "DETECTOR"])
        object_name = cls._get_str(header, ["OBJECT", "TARGNAME", "TARGET"]) or cls._get_str(primary_header, ["OBJECT", "TARGNAME", "TARGET"])
        filter_band = cls._get_str(header, ["FILTER", "FILTNAM", "BAND", "PASSBAND"]) or cls._get_str(primary_header, ["FILTER", "FILTNAM", "BAND", "PASSBAND"])

        # Extract RA & DEC
        ra_deg, dec_deg = cls._extract_coordinates(header)
        if ra_deg is None and dec_deg is None and primary_header is not header:
            ra_deg, dec_deg = cls._extract_coordinates(primary_header)

        # Evaluate WCS availability and pixel scale
        wcs_available, pixel_scale = cls._evaluate_wcs(header)
        if not wcs_available and primary_header is not header:
            wcs_available, pixel_scale = cls._evaluate_wcs(primary_header)

        # Collect critical header summary (combining primary and image header)
        headers_summary = cls._summarize_headers(primary_header)
        headers_summary.update(cls._summarize_headers(header))

        return FitsInspectionResponse(
            filename=filename,
            file_size_bytes=file_size,
            hdu_count=hdu_count,
            hdus=hdus_info,
            dimensions=dimensions,
            bitpix=bitpix,
            date_obs=date_obs,
            exptime=exptime,
            telescope=telescope,
            instrument=instrument,
            object_name=object_name,
            filter_band=filter_band,
            ra_deg=ra_deg,
            dec_deg=dec_deg,
            wcs_available=wcs_available,
            pixel_scale_arcsec=pixel_scale,
            headers_summary=headers_summary,
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
        """Extracts RA and DEC in decimal degrees from direct cards or CRVAL."""
        ra = cls._get_float(header, ["RA", "RA_DEG", "CRVAL1", "OBJRA"])
        dec = cls._get_float(header, ["DEC", "DEC_DEG", "CRVAL2", "OBJDEC"])

        # Validate range
        if ra is not None and not (0.0 <= ra <= 360.0):
            ra = None
        if dec is not None and not (-90.0 <= dec <= 90.0):
            dec = None

        return ra, dec

    @classmethod
    def _evaluate_wcs(cls, header: fits.Header) -> Tuple[bool, Optional[float]]:
        """Verifies if celestial WCS exists and calculates pixel scale in arcseconds."""
        # WCS requires CRVAL1, CRVAL2, CTYPE1, CTYPE2, and CD or CDELT
        try:
            w = WCS(header, relax=True)
            if not w.is_celestial:
                return False, None

            # Attempt to derive pixel scale in arcseconds
            try:
                scales = wcs_utils.proj_plane_pixel_scales(w)
                # scales are in degrees/pixel
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
        """Safely extracts key astrometric cards into a JSON-compatible dict."""
        important_keys = [
            "SIMPLE",
            "BITPIX",
            "NAXIS",
            "NAXIS1",
            "NAXIS2",
            "DATE-OBS",
            "EXPTIME",
            "TELESCOP",
            "INSTRUME",
            "OBJECT",
            "FILTER",
            "EQUINOX",
            "RADESYS",
            "CTYPE1",
            "CTYPE2",
            "CRVAL1",
            "CRVAL2",
            "CRPIX1",
            "CRPIX2",
            "CDELT1",
            "CDELT2",
            "BZERO",
            "BSCALE",
        ]

        summary: Dict[str, Any] = {}
        for key in important_keys:
            if key in header:
                val = header[key]
                # Filter out raw complex objects
                if isinstance(val, (int, float, bool, str)):
                    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
                        continue
                    summary[key] = val
        return summary

    @staticmethod
    def _get_str(header: fits.Header, keys: Union[str, List[str]]) -> Optional[str]:
        if isinstance(keys, str):
            keys = [keys]
        for k in keys:
            if k in header:
                val = header[k]
                if val is not None:
                    s = str(val).strip()
                    if s and s != "None":
                        return s
        return None

    @staticmethod
    def _get_int(header: fits.Header, key: str) -> Optional[int]:
        if key in header:
            try:
                return int(header[key])
            except (ValueError, TypeError):
                return None
        return None

    @staticmethod
    def _get_float(header: fits.Header, keys: Union[str, List[str]]) -> Optional[float]:
        if isinstance(keys, str):
            keys = [keys]
        for k in keys:
            if k in header:
                try:
                    val = float(header[k])
                    if not (math.isnan(val) or math.isinf(val)):
                        return val
                except (ValueError, TypeError):
                    continue
        return None
