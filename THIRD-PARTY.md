# 资源来源与许可

## Three.js 0.186.1

- 官方：https://github.com/mrdoob/three.js
- 获取：npm 官方 three 包，固定为 0.186.1。
- 使用文件：build/three.module.js、build/three.core.js、examples/jsm/controls/OrbitControls.js。
- 本地位置：dist/vendor/。
- 许可：MIT，原文保留为 dist/vendor/LICENSE。
- OrbitControls 的 bare import `three` 由页面 import map 指向本地文件；原文件未修改。

## 本项目原创内容

营地地形、湖泊、树木、花草、码头、六类设施、图标和界面均以代码原创；环境音与提示音通过 Web Audio 程序生成。本版本没有下载或使用 Kenney、Quaternius、Freesound 资源，也没有引入图片生成资产。

字体使用设备已有系统字体；没有随项目分发字体文件。无需外部 CDN、远程音频、API key 或在线天气服务。
