# 高德地图瓦片图层 Home Assistant 集成

将 Home Assistant 内置的 Carto 地图替换为高德地图瓦片，支持坐标纠偏和瓦片降级处理。

## 功能特点

- 🗺️ 自动替换 Carto 地图为高德地图
- 🔧 支持自定义代理服务器
- 📍 自动坐标纠偏（通过代理服务）
- 🎯 支持高级别缩放降级处理
- 🔄 自动监听 DOM 变化，实时替换新加载的瓦片

## 安装

### 通过 HACS（推荐）

1. 在 HACS 中添加自定义仓库：
   - 仓库：`https://github.com/lxg20082008/amap_ha`
   - 类别：`Dashbaord`

2. 搜索 "HA地图替换器" 并下载

3. 注册前端资源
4. 刷新浏览器

#### 自动清理 HACS 生成的 .gz 文件（可选）

注意：仓库结构说明

- 本仓库已将前端插件文件放在仓库根目录：`ha-map-replacer.js` 与 `config.json`。
- `hacs.json` 已设置为 `"content_in_root": true`，并包含 `"files": ["ha-map-replacer.js", "config.json"]`，因此 HACS 会把这两个文件一并下载到 Home Assistant 的 `www` / `hacsfiles` 目录。

如果你在 HACS 安装后仍然看到 `*.gz` 文件被生成，这是 Home Assistant/HACS 在服务端为加速传输自动生成的预压缩副本（与仓库结构无关）。下面提供一个可选的自动化脚本，用于定期清理这些 `.gz` 文件。

如果你希望定期删除 HA 主机中 HACS 目录下的 `.gz` 文件，可以按以下步骤配置一个简单的 Shell 脚本和 Home Assistant 自动化：

1) 在 HA 主机上创建清理脚本 `/config/scripts/clean_gz.sh`：

```bash
#!/bin/bash
# 清理 HACS 组件的 .gz 文件
HACS_DIR="/config/www/community"
HACSFILES_DIR="/config/hacsfiles"

find "$HACS_DIR" -name "*.gz" -type f -delete
find "$HACSFILES_DIR" -name "*.gz" -type f -delete

echo "$(date): Cleaned .gz files from HACS directories" >> /config/logs/clean_gz.log
```

给脚本设置可执行权限：

```bash
chmod +x /config/scripts/clean_gz.sh
mkdir -p /config/logs
```

2) 在 `configuration.yaml` 中添加 `shell_command` 与 `automation`（或在 UI 中创建同等自动化）：

```yaml
shell_command:
  clean_gz: bash /config/scripts/clean_gz.sh

automation:
  - alias: "清理 HACS .gz 文件"
    description: "每小时清理一次 HACS 目录中的 .gz 文件"
    trigger:
      - platform: time_pattern
        hours: "*"  # 每小时运行一次
    action:
      - service: shell_command.clean_gz
      - service: persistent_notification.create
        data:
          message: "已清理 HACS .gz 文件"
          title: "HACS 清理"
```

3) 在 HA 界面或通过服务手动测试 `shell_command.clean_gz`，并检查 `/config/logs/clean_gz.log` 以确认脚本执行情况。

说明：大多数情况下 `.gz` 文件为性能优化产生，删除它们不会影响插件功能，但可能导致传输效率下降；请根据需要启用此清理自动化。

### 手动安装

1. 将 `custom_components/amap_ha` 目录复制到你的 Home Assistant 配置目录
2. 注册前端资源
3. 刷新浏览器

## 配置

### 配置优先级：URL参数 > 外部配置 > 默认配置

###  配置说明：
    
1. 默认配置：在js文件里定义了：
   ```js
   const DEFAULT_CONFIG = {
   proxy_url: 'http://localhost:8280',
   max_zoom: 18,
   tile_size: 256
   };
   ```
   `'http://localhost:8280'`是默认配置。

2. 外部配置：如果你需要自定义配置，请手动在 `config/www/community/ha-map-replacer/` 中创建`config.json`文件，并在 `config/www/community/amap_ha/config.json` 文件中修改配置：

   ```json
   {
     "proxy_url": "http://192.168.31.3:8280",
     "max_zoom": 18,
     "tile_size": 256
   }
   ```

   **配置参数**：

   - `proxy_url` (可选): 高德地图代理服务的 URL，如果留空，则使用默认的代理地址。
   - `max_zoom` (可选): 地图最大缩放级别，默认为 `18`。
   - `tile_size` (可选): 瓦片大小，默认为 `256`。

3. URL参数
   可以通过浏览器地址栏传入参数：

   ```Code
   https://homeassistant.local:8123/map/0?amap_proxy=http://proxy_url:8280
   ```

  **注意：URL末尾没`/`** 


## 常见问题

### 地图无法加载

1.  **检查 `config.json` 文件路径**：确保 `config.json` 文件位于 `config/www/community/amap_ha/` 目录下。
2.  **检查 `proxy_url` 配置**：如果您的代理地址不正确，地图将无法加载。请确保代理服务正常运行，并且地址填写正确。
3.  **清除浏览器缓存**：修改配置或更新插件后，请务必清除浏览器缓存，然后重启 Home Assistant。

### HACS 安装问题

- **确保仓库类型正确**：在 HACS 中添加自定义仓库时，请选择“Lovelace”或“Plugin”类型。
- **文件结构**：确保仓库根目录下包含 `hacs.json` 和 `ha-map-replacer.js` 文件。
- **重启**：安装或更新后，请务必重启 Home Assistant。

## 支持

如有问题，请在 GitHub 提交 Issue。



## 许可证

MIT License

### 3. `LICENSE`
```text
MIT License

Copyright (c) 2025 高德地图瓦片图层集成

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
