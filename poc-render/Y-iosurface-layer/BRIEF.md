# POC Y: CALayer.contents → IOSurfaceRef → VideoToolbox 零拷贝

## 目标
验证：WKWebView 渲染后，直接从其 backing CALayer 读 IOSurface，喂 VTCompressionSession，零权限零拷贝。

## 验证标准
1. 能从 WKWebView 的 layer 树拿到 contents（IOSurfaceRef）
2. IOSurface 内容是当前帧画面（不是空/黑）
3. 能从 IOSurfaceRef 创建 CVPixelBuffer（CVPixelBufferCreateWithIOSurface）
4. CVPixelBuffer 能直接 append 到 AVAssetWriter
5. 输出 mp4 画面正确
6. 不需要 Screen Recording 权限

## 技术路径
```
WKWebView render
  → CALayer.contents (CFTypeRef → IOSurfaceRef)
    → CVPixelBufferCreateWithIOSurface
      → AVAssetWriterInputPixelBufferAdaptor.appendPixelBuffer
        → H.264 硬编 → mp4
```

## 备选路径
如果 CALayer.contents 不直接暴露 IOSurface：
- 遍历 sublayer 找 CALayerHost / _WKRemoteLayerTreeRootNode
- 用 CARenderer 离屏渲染到 IOSurface（CARenderer.setDestination）

## 依赖
- objc2 + objc2-quartz-core + IOSurface framework FFI
- 无额外权限

## 现有代码参考
- capture.rs: `MediaAgentTeam/recorder/src/capture.rs` — 现有 CALayer 抓帧
- encoder.rs: `MediaAgentTeam/recorder/src/encoder.rs` — 现有 AVAssetWriter 编码
