"""ASTRION Scientific Engine — Image Registration API Router.

Provides endpoints to trigger star-based image alignment, transformation estimation,
and registered observation retrieval.
"""

import os
from fastapi import APIRouter, HTTPException, Path
from fastapi.responses import FileResponse

from backend.app.config import settings
from backend.app.db.repository import observation_repo
from backend.app.models.registration import RegistrationRequest, RegistrationResponse
from backend.app.services.image_registration import ImageRegistrationService

router = APIRouter(prefix="/api/registration", tags=["Image Registration"])


@router.post("/run", response_model=RegistrationResponse)
def run_image_registration(payload: RegistrationRequest):
    """Aligns a target observation against a reference observation using real astronomical registration."""
    ref_id = payload.reference_observation_id
    tgt_id = payload.target_observation_id

    # Verify both observations exist
    ref_obs = observation_repo.get_by_id(ref_id)
    if not ref_obs:
        raise HTTPException(status_code=404, detail=f"Reference observation '{ref_id}' not found.")

    tgt_obs = observation_repo.get_by_id(tgt_id)
    if not tgt_obs:
        raise HTTPException(status_code=404, detail=f"Target observation '{tgt_id}' not found.")

    try:
        response = ImageRegistrationService.register_observations(
            reference_obs_id=ref_id,
            target_obs_id=tgt_id,
        )
        return response
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Image registration failed: {exc}")


@router.get("/{target_observation_id}", response_model=RegistrationResponse)
def get_registration_results(
    target_observation_id: str = Path(..., description="ID of the target observation"),
):
    """Retrieves the latest persisted registration metrics for a target observation."""
    run = observation_repo.get_latest_registration_run(target_observation_id)
    if not run:
        raise HTTPException(
            status_code=404,
            detail=f"No registration record found for observation '{target_observation_id}'.",
        )

    return RegistrationResponse(
        run_id=run["run_id"],
        reference_observation_id=run["reference_observation_id"],
        target_observation_id=run["target_observation_id"],
        success=run["success"],
        rotation_deg=run["rotation_deg"],
        translation_x=run["translation_x"],
        translation_y=run["translation_y"],
        scale=run["scale"],
        residual_rms=run["residual_rms"],
        matched_stars_count=run["matched_stars_count"],
        transformation_matrix=run["transformation_matrix"],
        registered_preview_url=f"/api/registration/{target_observation_id}/preview" if run["success"] else None,
        message=run["message"],
    )


@router.get("/{target_observation_id}/preview")
def get_registered_preview(
    target_observation_id: str = Path(..., description="Target Observation ID"),
):
    """Streams the registered and warped target observation preview PNG."""
    filename = f"registered_{target_observation_id}.png"
    filepath = os.path.join(settings.PREVIEWS_DIR, filename)

    if not os.path.exists(filepath):
        raise HTTPException(
            status_code=404,
            detail=f"No registered preview found for observation '{target_observation_id}'. Run registration first.",
        )

    return FileResponse(filepath, media_type="image/png")


@router.get("/{target_observation_id}/fits")
def download_registered_fits(
    target_observation_id: str = Path(..., description="Target Observation ID"),
):
    """Downloads the registered target observation FITS file."""
    run = observation_repo.get_latest_registration_run(target_observation_id)
    if not run or not run.get("registered_fits_path"):
        raise HTTPException(
            status_code=404,
            detail=f"No registered FITS file found for observation '{target_observation_id}'.",
        )

    filepath = run["registered_fits_path"]
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Registered FITS file missing on disk.")

    return FileResponse(
        filepath,
        media_type="application/fits",
        filename=os.path.basename(filepath),
    )
