"""Frontend platform for amap-ha."""
from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.components.frontend import async_register_built_in_panel


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the amap-ha frontend platform."""
    # Register the frontend module
    await async_register_built_in_panel(
        hass,
        "amap-tile-layer",
        "amap_ha",
        "amap-tile-layer.js",
        update=True,
    )
    return True