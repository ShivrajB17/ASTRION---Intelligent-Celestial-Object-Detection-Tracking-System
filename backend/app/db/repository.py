"""ASTRION SQLite Persistence Layer for Observation Management.

Provides high-performance, thread-safe SQLite storage for astronomical observations,
metadata, HDU topologies, and file references. Never stores raw pixel arrays in DB.
"""

import json
import os
import sqlite3
from typing import Any, Dict, List, Optional
from backend.app.config import settings
from backend.app.models.fits import FitsDimensions, HduInfo
from backend.app.models.observation import ObservationRecord, PixelStatistics


class ObservationRepository:
    """Manages SQLite persistence for astronomical observation records."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or settings.DATABASE_PATH
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        return conn

    def _init_db(self) -> None:
        """Initializes observation database tables and indexes."""
        with self._get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS observations (
                    id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    file_size_bytes INTEGER NOT NULL,
                    file_hash TEXT,
                    created_at TEXT NOT NULL,
                    date_obs TEXT,
                    exptime REAL,
                    telescope TEXT,
                    instrument TEXT,
                    object_name TEXT,
                    filter_band TEXT,
                    equinox REAL,
                    ra_deg REAL,
                    dec_deg REAL,
                    wcs_available INTEGER NOT NULL DEFAULT 0,
                    pixel_scale_arcsec REAL,
                    selected_hdu_index INTEGER NOT NULL DEFAULT 0,
                    selected_hdu_name TEXT NOT NULL DEFAULT 'PRIMARY',
                    selected_hdu_type TEXT NOT NULL DEFAULT 'PrimaryHDU',
                    total_hdus INTEGER NOT NULL DEFAULT 1,
                    hdus_json TEXT,
                    naxis INTEGER,
                    width INTEGER,
                    height INTEGER,
                    depth INTEGER,
                    bitpix INTEGER,
                    dtype TEXT,
                    stat_min REAL,
                    stat_max REAL,
                    stat_mean REAL,
                    stat_median REAL,
                    stat_std REAL,
                    valid_pixels INTEGER DEFAULT 0,
                    nan_pixels INTEGER DEFAULT 0,
                    inf_pixels INTEGER DEFAULT 0,
                    total_pixels INTEGER DEFAULT 0,
                    headers_summary_json TEXT,
                    ingestion_status TEXT NOT NULL DEFAULT 'ingested',
                    has_preview INTEGER NOT NULL DEFAULT 0,
                    preview_path TEXT
                );
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_obs_hash ON observations(file_hash);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_obs_created ON observations(created_at);")
            conn.commit()

    def insert(
        self,
        obs: ObservationRecord,
        file_path: str,
        preview_path: Optional[str] = None,
    ) -> ObservationRecord:
        """Persists a new observation record into SQLite."""
        hdus_json = json.dumps([h.model_dump() for h in obs.hdus])
        headers_json = json.dumps(obs.headers_summary)

        stat = obs.statistics or PixelStatistics()
        dim = obs.dimensions

        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO observations (
                    id, filename, file_path, file_size_bytes, file_hash,
                    created_at, date_obs, exptime, telescope, instrument,
                    object_name, filter_band, equinox, ra_deg, dec_deg,
                    wcs_available, pixel_scale_arcsec, selected_hdu_index,
                    selected_hdu_name, selected_hdu_type, total_hdus, hdus_json,
                    naxis, width, height, depth, bitpix, dtype,
                    stat_min, stat_max, stat_mean, stat_median, stat_std,
                    valid_pixels, nan_pixels, inf_pixels, total_pixels,
                    headers_summary_json, ingestion_status, has_preview, preview_path
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?
                );
                """,
                (
                    obs.id,
                    obs.filename,
                    file_path,
                    obs.file_size_bytes,
                    obs.file_hash,
                    obs.created_at,
                    obs.date_obs,
                    obs.exptime,
                    obs.telescope,
                    obs.instrument,
                    obs.object_name,
                    obs.filter_band,
                    obs.equinox,
                    obs.ra_deg,
                    obs.dec_deg,
                    1 if obs.wcs_available else 0,
                    obs.pixel_scale_arcsec,
                    obs.selected_hdu_index,
                    obs.selected_hdu_name,
                    obs.selected_hdu_type,
                    obs.total_hdus,
                    hdus_json,
                    dim.naxis if dim else None,
                    dim.width if dim else None,
                    dim.height if dim else None,
                    dim.depth if dim else None,
                    obs.bitpix,
                    obs.dtype,
                    stat.min,
                    stat.max,
                    stat.mean,
                    stat.median,
                    stat.std,
                    stat.valid_pixels,
                    stat.nan_pixels,
                    stat.inf_pixels,
                    stat.total_pixels,
                    headers_json,
                    obs.ingestion_status,
                    1 if obs.has_preview else 0,
                    preview_path,
                ),
            )
            conn.commit()

        return self.get_by_id(obs.id) or obs

    def get_by_id(self, obs_id: str) -> Optional[ObservationRecord]:
        """Retrieves an observation by ID, detecting if the source file is missing."""
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM observations WHERE id = ?;", (obs_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_record(row)

    def get_by_hash(self, file_hash: str) -> Optional[ObservationRecord]:
        """Retrieves an observation by its file content SHA256 hash."""
        if not file_hash:
            return None
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM observations WHERE file_hash = ? LIMIT 1;", (file_hash,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_record(row)

    def list_all(self) -> List[ObservationRecord]:
        """Lists all persisted observations in reverse chronological order."""
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM observations ORDER BY created_at DESC;")
            rows = cursor.fetchall()
            return [self._row_to_record(row) for row in rows]

    def delete_by_id(self, obs_id: str) -> bool:
        """Deletes an observation record and unlinks its associated files from disk."""
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT file_path, preview_path FROM observations WHERE id = ?;", (obs_id,))
            row = cursor.fetchone()
            if not row:
                return False

            file_path = row["file_path"]
            preview_path = row["preview_path"]

            conn.execute("DELETE FROM observations WHERE id = ?;", (obs_id,))
            conn.commit()

        # Remove source FITS file if it exists
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass

        # Remove preview image if it exists
        if preview_path and os.path.exists(preview_path):
            try:
                os.remove(preview_path)
            except OSError:
                pass

        return True

    def get_file_path(self, obs_id: str) -> Optional[str]:
        """Returns the local source file path for an observation."""
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT file_path FROM observations WHERE id = ?;", (obs_id,))
            row = cursor.fetchone()
            return row["file_path"] if row else None

    def get_preview_path(self, obs_id: str) -> Optional[str]:
        """Returns the local preview PNG file path for an observation."""
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT preview_path FROM observations WHERE id = ?;", (obs_id,))
            row = cursor.fetchone()
            return row["preview_path"] if row else None

    def _row_to_record(self, row: sqlite3.Row) -> ObservationRecord:
        """Converts an SQLite row into a validated ObservationRecord model."""
        file_path = row["file_path"]
        file_exists = bool(file_path and os.path.exists(file_path))
        ingestion_status = row["ingestion_status"]
        if not file_exists and ingestion_status == "ingested":
            ingestion_status = "missing_file"

        # Parse HDUs JSON
        hdus = []
        if row["hdus_json"]:
            try:
                hdus = [HduInfo(**h) for h in json.loads(row["hdus_json"])]
            except Exception:
                hdus = []

        # Parse Headers JSON
        headers_summary = {}
        if row["headers_summary_json"]:
            try:
                headers_summary = json.loads(row["headers_summary_json"])
            except Exception:
                headers_summary = {}

        dimensions = None
        if row["naxis"] is not None:
            dimensions = FitsDimensions(
                naxis=row["naxis"],
                width=row["width"],
                height=row["height"],
                depth=row["depth"],
            )

        statistics = PixelStatistics(
            min=row["stat_min"],
            max=row["stat_max"],
            mean=row["stat_mean"],
            median=row["stat_median"],
            std=row["stat_std"],
            valid_pixels=row["valid_pixels"] or 0,
            nan_pixels=row["nan_pixels"] or 0,
            inf_pixels=row["inf_pixels"] or 0,
            total_pixels=row["total_pixels"] or 0,
        )

        has_preview = bool(row["has_preview"])
        preview_url = f"/api/observations/{row['id']}/preview" if has_preview else None

        return ObservationRecord(
            id=row["id"],
            filename=row["filename"],
            file_size_bytes=row["file_size_bytes"],
            file_hash=row["file_hash"],
            file_exists=file_exists,
            created_at=row["created_at"],
            date_obs=row["date_obs"],
            exptime=row["exptime"],
            telescope=row["telescope"],
            instrument=row["instrument"],
            object_name=row["object_name"],
            filter_band=row["filter_band"],
            equinox=row["equinox"],
            ra_deg=row["ra_deg"],
            dec_deg=row["dec_deg"],
            wcs_available=bool(row["wcs_available"]),
            pixel_scale_arcsec=row["pixel_scale_arcsec"],
            selected_hdu_index=row["selected_hdu_index"],
            selected_hdu_name=row["selected_hdu_name"],
            selected_hdu_type=row["selected_hdu_type"],
            total_hdus=row["total_hdus"],
            hdus=hdus,
            dimensions=dimensions,
            bitpix=row["bitpix"],
            dtype=row["dtype"],
            statistics=statistics,
            headers_summary=headers_summary,
            ingestion_status=ingestion_status,
            has_preview=has_preview,
            preview_url=preview_url,
        )


observation_repo = ObservationRepository()
