"""ASTRION Backend Configuration."""

import os
from typing import List


class Settings:
    APP_NAME: str = "ASTRION Astronomical Intelligence Backend"
    VERSION: str = "0.1.0"
    HOST: str = os.getenv("ASTRION_BACKEND_HOST", "127.0.0.1")
    PORT: int = int(os.getenv("ASTRION_BACKEND_PORT", "8088"))
    
    # Allowed CORS origins for local Vite dev server, Electron, and local clients
    CORS_ORIGINS: List[str] = [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:8088",
        "http://localhost:8088",
        "app://.",
        "vscode-webview://",
    ]

    # Maximum allowed payload size for FITS inspection (500 MB)
    MAX_UPLOAD_SIZE_BYTES: int = int(os.getenv("ASTRION_MAX_UPLOAD_BYTES", 500 * 1024 * 1024))


settings = Settings()
