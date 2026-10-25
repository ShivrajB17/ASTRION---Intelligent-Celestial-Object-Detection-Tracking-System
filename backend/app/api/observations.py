"""ASTRION Observation Management Endpoints.

Provides RESTful operations for listing, retrieving, deleting observations,
and streaming scientific image previews.
"""

import os
from fastapi import APIRouter, HTTPException, Response, status
from fastapi.responses import FileResponse
from backend.app.db.repository import observation_repo
from backend.app.models.observation import ObservationListResponse, ObservationRecord

router = APIRouter(prefix="/api/observations", tags=["Observations"])


@router.get("", response_model=ObservationListResponse)
def list_observations() -> ObservationListResponse:
    """Lists all ingested astronomical observations from SQLite persistence.
    
    Automatically detects missing or moved source FITS files on disk.
    """
    records = observation_repo.list_all()
    return ObservationListResponse(
        count=len(records),
        observations=records,
    )


@router.get("/{obs_id}", response_model=ObservationRecord)
def get_observation(obs_id: str) -> ObservationRecord:
    """Retrieves an observation by its unique identifier."""
    record = observation_repo.get_by_id(obs_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation '{obs_id}' not found.",
        )
    return record


@router.delete("/{obs_id}", status_code=status.HTTP_200_OK)
def delete_observation(obs_id: str) -> dict:
    """Deletes an observation record and unlinks its managed files from disk."""
    success = observation_repo.delete_by_id(obs_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation '{obs_id}' not found.",
        )
    return {
        "status": "deleted",
        "id": obs_id,
        "message": f"Observation '{obs_id}' was successfully removed from workspace.",
    }


@router.get("/{obs_id}/preview")
def get_observation_preview(obs_id: str):
    """Streams the normalized scientific 8-bit grayscale PNG preview of the observation."""
    preview_path = observation_repo.get_preview_path(obs_id)
    if not preview_path or not os.path.exists(preview_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Preview image for observation '{obs_id}' is not available.",
        )
    return FileResponse(
        path=preview_path,
        media_type="image/png",
        filename=f"{obs_id}_preview.png",
    )
