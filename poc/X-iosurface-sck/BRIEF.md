# POC X: ScreenCaptureKit → IOSurface → VideoToolbox 零拷贝

## 目标
验证：ScreenCaptureKit 抓 WKWebView 窗口帧 → CMSampleBuffer 的 IOSurface → 直喂 VTCompressionSession，全程零 CPU 拷贝。

## 验证标准
1. 能拿到 SCStream 的 CMSampleBuffer
2. 能从 CMSampleBuffer 取出 CVPixelBuffer（IOSurface backed）
3. 能把 CVPixelBuffer 直接 append 到 AVAssetWriter（不经过 CGBitmapContext）
4. 输出 mp4 画面正确
5. 对比现有 CALayer.renderInContext 路线的 CPU 占用和帧率

## 技术路径
```
SCStream(filter: WKWebView window)
  → SCStreamOutput.didOutputSampleBuffer
    → CMSampleBufferGetImageBuffer → CVPixelBuffer (IOSurface backed)
      → AVAssetWriterInputPixelBufferAdaptor.appendPixelBuffer
        → H.264 硬编 → mp4
```

## 依赖
- screencapturekit-rs crate (或直接 objc2 FFI)
- macOS 13+ (ScreenCaptureKit)
- Screen Recording 权限（一次性授权）

## 现有代码参考
- encoder.rs: `MediaAgentTeam/recorder/src/encoder.rs` — 现有 AVAssetWriter 编码
- capture.rs: `MediaAgentTeam/recorder/src/capture.rs` — 现有 CALayer 抓帧
