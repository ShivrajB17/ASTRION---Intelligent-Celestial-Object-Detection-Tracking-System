"""ASTRION Scientific Engine — Source Detection and Background API Router.

Provides endpoints to trigger real 2D background modeling, Photutils source detection,
sub-pixel centroid extraction, and preview retrieval.
"""

import os
from fastapi import APIRouter, HTTPException, Path
from fastapi.responses import FileResponse

from backend.app.config import settings
from backend.app.db.repository import observation_repo
from backend.app.models.detection import (
    BackgroundMetadataResponse,
    DetectedSource,
    DetectionParameters,
    DetectionRequest,
    DetectionResponse,
)
from backend.app.services.fits_ingestor import FitsIngestionService
from backend.app.services.source_detector import SourceDetectorService

router = APIRouter(prefix="/api/detection", tags=["Source Detection"])


@router.post("/run", response_model=DetectionResponse)
def run_source_detection(payload: DetectionRequest):
    """Executes genuine Photutils source detection and centroid extraction on an observation."""
    obs_id = payload.observation_id
    params = payload.parameters or DetectionParameters()

    # Load authentic observation array and header
    try:
        data, header, _ = FitsIngestionService.load_observation_data_and_header(obs_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load observation: {exc}")

    try:
        response = SourceDetectorService.run_detection(
            data=data,
            header=header,
            params=params,
            obs_id=obs_id,
        )
        return response
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Source detection execution failed: {exc}")


@router.get("/{observation_id}", response_model=DetectionResponse)
def get_detection_results(
    observation_id: str = Path(..., description="ID of the analyzed observation"),
):
    """Retrieves the latest persisted scientific detection catalog for an observation."""
    run = observation_repo.get_latest_detection_run(observation_id)
    if not run:
        raise HTTPException(
            status_code=404,
            detail=f"No source detection catalog found for observation '{observation_id}'. Run detection first.",
        )

    sources = [DetectedSource(**s) for s in run.get("sources", [])]
    params = DetectionParameters(**run.get("parameters", {}))

    return DetectionResponse(
        run_id=run["run_id"],
        observation_id=run["observation_id"],
        source_count=run["source_count"],
        background_median=run["background_median"],
        background_rms=run["background_rms"],
        parameters=params,
        sources=sources,
        execution_time_ms=run["execution_time_ms"],
        bkg_subtracted_preview_url=f"/api/detection/{observation_id}/preview/subtracted",
        bkg_map_preview_url=f"/api/detection/{observation_id}/preview/background",
    )


@router.get("/{observation_id}/background", response_model=BackgroundMetadataResponse)
def get_background_metadata(
    observation_id: str = Path(..., description="ID of the analyzed observation"),
):
    """Retrieves 2D background and noise floor modeling metrics for an observation."""
    run = observation_repo.get_latest_detection_run(observation_id)
    if not run:
        # If no prior detection run exists, calculate on demand
        try:
            data, header, _ = FitsIngestionService.load_observation_data_and_header(observation_id)
            params = DetectionParameters()
            det_res = SourceDetectorService.run_detection(data, header, params, observation_id)
            return BackgroundMetadataResponse(
                observation_id=observation_id,
                background_median=det_res.background_median,
                background_rms=det_res.background_rms,
                box_size=params.box_size,
                filter_size=params.filter_size,
                bkg_subtracted_preview_url=det_res.bkg_subtracted_preview_url,
                bkg_map_preview_url=det_res.bkg_map_preview_url,
            )
        except Exception as exc:
            raise HTTPException(status_code=404, detail=f"Cannot compute background: {exc}")

    params = run.get("parameters", {})
    return BackgroundMetadataResponse(
        observation_id=observation_id,
        background_median=run["background_median"],
        background_rms=run["background_rms"],
        box_size=params.get("box_size", 64),
        filter_size=params.get("filter_size", 3),
        bkg_subtracted_preview_url=f"/api/detection/{observation_id}/preview/subtracted",
        bkg_map_preview_url=f"/api/detection/{observation_id}/preview/background",
    )


@router.get("/{observation_id}/preview/subtracted")
def get_subtracted_preview(
    observation_id: str = Path(..., description="Observation ID"),
):
    """Streams the background-subtracted scientific preview PNG."""
    filename = f"{observation_id}_bkg_sub.png"
    filepath = os.path.join(settings.PREVIEWS_DIR, filename)
    if not os.path.exists(filepath):
        # Generate on demand if missing
        try:
            data, header, _ = FitsIngestionService.load_observation_data_and_header(observation_id)
            SourceDetectorService.run_detection(data, header, DetectionParameters(), observation_id)
        except Exception as exc:
            raise HTTPException(status_code=404, detail=f"Subtracted preview not found: {exc}")

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Background-subtracted preview could not be generated.")

    return FileResponse(filepath, media_type="image/png")


@router.get("/{observation_id}/preview/background")
def get_background_map_preview(
    observation_id: str = Path(..., description="Observation ID"),
):
    """Streams the 2D background mesh preview PNG."""
    filename = f"{observation_id}_bkg_map.png"
    filepath = os.path.join(settings.PREVIEWS_DIR, filename)
    if not os.path.exists(filepath):
        # Generate on demand if missing
        try:
            data, header, _ = FitsIngestionService.load_observation_data_and_header(observation_id)
            SourceDetectorService.run_detection(data, header, DetectionParameters(), observation_id)
        except Exception as exc:
            raise HTTPException(status_code=404, detail=f"Background map preview not found: {exc}")

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Background map preview could not be generated.")

    return FileResponse(filepath, media_type="image/png")
