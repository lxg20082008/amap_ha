

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
   - 仓库：`https://github.com/lxg20082008/ha-map-replacer`
   - 类别：Lovelace

2. 搜索 "HA地图替换器" 并安装

3. 重启 Home Assistant

### 手动安装

1. 将 `custom_components/amap_ha` 目录复制到你的 Home Assistant 配置目录
2. 重启 Home Assistant

## 配置

在 `config/www/community/ha-map-replacer/config.json` 文件中修改配置：

```json
{
  "proxy_url": "",
  "max_zoom": 18,
  "tile_size": 256
}
```

**配置参数**：
- `proxy_url` (可选): 高德地图代理服务的 URL，如果留空，则使用默认的代理地址。
- `max_zoom` (可选): 地图最大缩放级别，默认为 `18`。
- `tile_size` (可选): 瓦片大小，默认为 `256`。

## 常见问题

### 地图无法加载

1.  **检查 `config.json` 文件路径**：确保 `config.json` 文件位于 `config/www/community/ha-map-replacer/` 目录下。
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
