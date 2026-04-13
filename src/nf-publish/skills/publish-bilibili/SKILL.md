---
name: publish-bilibili
description: >
  发布视频到B站。通过 automedia 操作创作者中心，模拟人类完成发布。
  自动处理：标题、描述、标签（Enter确认）、分区、封面、投稿。
  TRIGGER: "发B站"、"发到B站"、"B站发布"、"publish bilibili"、"上传到B站"、"投稿B站"。
  DO NOT TRIGGER when: 其他平台发布、纯视频制作。
argument-hint: "<视频路径> [标题] [描述] [标签...]"
---

# /publish-bilibili — 发布视频到B站

通道：B站 = tab 2 → `/tmp/wp-cmd-2.js` `/tmp/wp-result-2.txt`

## 脚本调用（推荐）

所有操作已封装到 `scripts/bili.sh`，一次一个动作：

```bash
bash scripts/bili.sh open                    # 打开上传页
bash scripts/bili.sh upload "$VIDEO"         # 上传视频
bash scripts/bili.sh dismiss                 # 关弹窗
bash scripts/bili.sh title "标题"            # 填标题
bash scripts/bili.sh desc "描述内容"          # 填描述
bash scripts/bili.sh tag "ClaudeCode"        # 加标签（每次一个）
bash scripts/bili.sh submit                  # 投稿
bash scripts/bili.sh check                   # 检查结果
bash scripts/bili.sh screenshot              # 截图
```

**每个动作之间 AI 自己 sleep + screenshot 验证。** 不要连续调用不等结果。

## 核心规则

1. **视频路径必须纯 ASCII** — 含中文的路径先 `cp` 到 `/tmp/bilibili-upload.mp4`（已修复 fileURLWithPath，但保险起见仍推荐）
2. **上传页有 ~7 秒窗口** — 页面加载后会自动跳首页，必须在窗口期内触发 file input click
3. **标签用 type + key enter** — B站标签是普通 input，Enter 确认即可
4. **描述是 contenteditable** — 用 execCommand 或 innerHTML 写入

## 发布流程

### 1. 导航到上传页

```bash
echo "goto https://member.bilibili.com/platform/upload/video/frame" > /tmp/wp-cmd-2.js
sleep 4
```

### 2. 上传视频（7 秒窗口内）

```bash
# 复制到无中文路径（保险）
cp "$VIDEO" /tmp/bilibili-upload.mp4
echo "/tmp/bilibili-upload.mp4" > /tmp/wp-upload-path-2.txt

# 立即点击 file input
echo '(function(){var all=document.querySelectorAll("input[type=file]");if(all.length>0){all[0].click();return "clicked";}return "no input";})()' > /tmp/wp-cmd-2.js
sleep 3

# 验证上传路径被消费
ls /tmp/wp-upload-path-2.txt 2>/dev/null && echo "UPLOAD FAILED" || echo "UPLOAD OK"
```

### 3. 等待跳转到发布页

```bash
# 上传成功后页面停留在同一 URL 但变为编辑表单
sleep 5
echo '(function(){return document.querySelector("input[placeholder*=稿件标题]")?"EDIT_PAGE":"WAITING";})()' > /tmp/wp-cmd-2.js
sleep 1
```

### 4. 关弹窗（通知权限等）

```bash
echo '(function(){var c=0;document.querySelectorAll("button,span,div").forEach(function(e){var t=e.textContent.trim();if((t==="知道了"||t==="禁止")&&e.offsetWidth>0&&e.offsetHeight<60){e.click();c++;}});return c;})()' > /tmp/wp-cmd-2.js
sleep 1
```

### 5. 填标题（≤80字）

**必须先清空再设值，否则 React 状态不更新：**

```bash
cat > /tmp/wp-cmd-2.js << 'JS'
(function(){
    var input = document.querySelector('input[placeholder*="稿件标题"]');
    if(!input) return "no title input";
    var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    // 先清空触发 React 状态重置
    setter.call(input, '');
    input.dispatchEvent(new Event('input', {bubbles: true}));
    // 再设新值
    setter.call(input, '标题内容');
    input.dispatchEvent(new Event('input', {bubbles: true}));
    input.dispatchEvent(new Event('change', {bubbles: true}));
    return "ok: " + input.value;
})()
JS
sleep 1
```

**验证标题确实改了：** 返回值应包含新标题文字。如果返回旧值，说明 React 没响应。

### 6. 填描述（contenteditable）

```bash
cat > /tmp/wp-cmd-2.js << 'JS'
(function(){
    var ed = document.querySelector('[contenteditable=true]');
    if(!ed) return "no editor";
    ed.focus();
    ed.innerText = '';
    var lines = ["第一行描述", "", "第二行描述"];
    for(var i=0; i<lines.length; i++){
        if(i>0) document.execCommand('insertParagraph', false, null);
        if(lines[i]) document.execCommand('insertText', false, lines[i]);
    }
    return "ok";
})()
JS
sleep 1
```

### 7. 添加标签（type + Enter）

```bash
TAGS=("ClaudeCode" "AI编程" "源码解析")

# 先聚焦标签输入框
echo '(function(){var inp=document.querySelector("input[placeholder*=\"按回车键\"]");if(inp){inp.focus();inp.click();return "ok";}return "no";})()' > /tmp/wp-cmd-2.js
sleep 1

for tag in "${TAGS[@]}"; do
    echo "type ${tag}" > /tmp/wp-cmd-2.js
    sleep 2
    echo "key enter" > /tmp/wp-cmd-2.js
    sleep 1
done
```

### 8. 等上传完成

```bash
for i in $(seq 1 30); do
    echo '(function(){if(document.body.innerText.indexOf("上传完成")>=0||document.body.innerText.indexOf("更换视频")>=0)return "COMPLETE";return "uploading";})()' > /tmp/wp-cmd-2.js
    sleep 3
    grep -q "COMPLETE" /tmp/wp-result-2.txt && break
done
```

### 9. 投稿（或存草稿）

```bash
# 存草稿（安全，可编辑后再发布）
echo '(function(){var b=document.querySelectorAll("button");for(var i=0;i<b.length;i++){if(b[i].textContent.trim()==="存草稿"&&b[i].offsetWidth>0){b[i].click();return "ok";}}return "no";})()' > /tmp/wp-cmd-2.js
sleep 3

# 或直接投稿
echo '(function(){var b=document.querySelectorAll("button");for(var i=0;i<b.length;i++){if(b[i].textContent.trim()==="立即投稿"&&b[i].offsetWidth>0){b[i].click();return "ok";}}return "no";})()' > /tmp/wp-cmd-2.js
sleep 5

# 验证成功 = 跳转到内容管理页
echo "window.location.href" > /tmp/wp-cmd-2.js
sleep 1
```

### 10. 删除测试稿（可选）

```bash
# 导航到内容管理草稿页
echo "goto https://member.bilibili.com/platform/upload/video/frame" > /tmp/wp-cmd-2.js
# 草稿页会显示在内容管理
# 点击"删除" → 点击"确定"
```

## 输入方式总结

| 内容 | 方法 | 不抢键盘 |
|------|------|---------|
| 标题 | JS nativeInputValueSetter | ✅ |
| 描述 | JS contenteditable + execCommand | ✅ |
| 标签 | JS focus → `type 标签名` → `key enter` | ✅ |
| 按钮 | JS querySelector + click | ✅ |
| 封面 | 自动提取，无需操作 | ✅ |

## 视频规格

| 属性 | 要求 |
|------|------|
| 尺寸 | 1080x1920（9:16），无需比例转换 |
| 格式 | MP4 优先，也支持 MOV/MKV/AVI 等 |
| 大小 | ≤8GB |
| 标题 | ≤80 字 |
| 标签 | 每个 Enter 确认，最多 10 个 |

## 分区

B站会根据视频内容自动推荐分区（如"人工智能"），默认可能是"音乐"等不相关分区。

**实测发现（2026-04-02）：** 点击"立即投稿"时 B站会自动纠正分区到更匹配的类别（AI 内容 → "人工智能"）。如果分区明显不对，可以不管——投稿时系统会修正。

手动改分区比较复杂（自定义级联下拉组件），非必要不折腾。

## 批量操作弹窗

**上传多个视频时会弹"批量操作"对话框。** 点"取消"或"暂不设置"关掉：

```bash
echo 'clickel text:取消' > /tmp/wp-cmd-2.js; sleep 2
# 或
echo 'clickel text:暂不设置' > /tmp/wp-cmd-2.js; sleep 2
```

## 投稿成功标志

投稿成功后页面显示"稿件投递成功"文字，可用于验证：

```bash
echo '(function(){return document.body.innerText.indexOf("稿件投递成功")>=0?"SUCCESS":"NOT_YET";})()' > /tmp/wp-cmd-2.js
```

## 合集

**B站合集功能需要创作者认证。** 未认证账号看到的是提示"开通合集功能请在创作者中心里完成认证"。已认证账号可在投稿页底部"加入合集"区域操作。

## 标签验证结果（2026-04-02 测试）

- `type 标签名` + `key enter` 方式验证可行，标签显示为蓝色标签pill
- 默认会自动添加 "生活记录"、"默认" 等推荐标签
- 连续添加多个标签正常工作
- 标签输入框 placeholder: "按回车键Enter创建标签"

## 与抖音的关键区别

| 项目 | 抖音 | B站 |
|------|------|-----|
| 编辑器 | Slate.js（复杂） | 普通 HTML（简单） |
| 话题标签 | #话题 + 空格（蓝色识别） | input + Enter |
| 视频比例 | 需 pad 到 9:19.5 | 原始 9:16 即可 |
| 描述 | execCommand | contenteditable/innerHTML |
| 封面 | 需手动选"智能推荐" | 自动提取 |

## 防封要点（风险等级：低）

B站对上传自动化最宽容，`biliup` 等开源工具广泛使用无封号报告。主要风险是内容重复。

**随机延迟：**

```bash
wp_sleep() { sleep $(python3 -c "import random; print(round(random.uniform(${1:-1}, ${2:-3}), 1))"); }
```

**频率限制：**
- 每天 ≤5 条
- 不要批量上传完全相同内容

**已有保护：**
- WKWebView 无自动化指纹
- 打字速度已随机化（55-130ms/字）
- 点击坐标已加 ±1px 抖动

## 封面

**视频自带封面帧，不需要手动设置。** B站自动提取，默认即可。不要点"封面设定"。

## 发布后自验证（强制）

验证页面：`goto https://member.bilibili.com/platform/upload-manager/article` → 截图看第一条

**发完必须自己确认。不确认 = 没发完。**

1. 发布后立即 `check` — 不等用户问
2. check 不是 SUCCESS → 截图排查，不要报"已发布"
3. 去管理页二次确认 — check 只是初判，管理页截图才是铁证
4. 对比标题和时间 — 确认是刚发的不是旧的
5. 有合集的要确认合集内容数

## 严禁删除（铁律）

**AI 严禁删除任何平台上的已发布内容。不写 delete 动作，不点删除按钮，不提及删除操作。删除只能由用户本人手动操作。**

## 不用平台字幕（强制）

**视频自带硬字幕（烧录在画面里）。上传后如果平台弹出"自动字幕"/"智能字幕"/"AI字幕"提示，必须关掉或跳过。** 双重字幕 = 画面重叠 = 废了。

检查方式：上传后截图，看是否有字幕相关弹窗或开关，有就关掉。
