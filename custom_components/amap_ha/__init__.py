"""高德地图瓦片图层集成."""
import logging
import voluptuous as vol
from homeassistant.core import HomeAssistant
import homeassistant.helpers.config_validation as cv

_LOGGER = logging.getLogger(__name__)

# 集成配置常量
DOMAIN = "amap_ha"
CONF_PROXY_URL = "proxy_url"
DEFAULT_PROXY_URL = "http://localhost:8280"

CONFIG_SCHEMA = vol.Schema({
    DOMAIN: vol.Schema({
        vol.Optional(CONF_PROXY_URL, default=DEFAULT_PROXY_URL): cv.string,
    })
}, extra=vol.ALLOW_EXTRA)

async def async_setup(hass: HomeAssistant, config: dict):
    """设置集成."""
    domain_config = config.get(DOMAIN, {})
    
    # 存储配置到 hass.data
    hass.data[DOMAIN] = {
        CONF_PROXY_URL: domain_config.get(CONF_PROXY_URL, DEFAULT_PROXY_URL)
    }

    # 注册前端资源
    hass.http.register_static_path(
        "/hacsfiles/amap-tile-layer/amap-tile-layer.js",
        hass.config.path("custom_components/amap_ha/frontend/amap-tile-layer.js"),
        cache_headers=False
    )

    _LOGGER.info(
        "高德地图瓦片图层集成已加载，代理URL: %s",
        hass.data[DOMAIN][CONF_PROXY_URL]
    )
    return True

async def async_setup_entry(hass, entry):
    """通过UI设置集成条目."""
    return True

async def async_remove_entry(hass, entry):
    """移除集成条目."""
    return True