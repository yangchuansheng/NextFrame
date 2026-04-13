---
name: publish-channels
description: >
  发布视频到微信视频号。通过 automedia 操作视频号助手，模拟人类完成发布。
  自动处理：上传、描述、话题标签、短标题、封面、合集、发表。
  关键：视频号用无界(wujie)微前端，表单在 Shadow DOM 里，所有操作需从 shadowRoot 查询。
  TRIGGER: "发视频号"、"发到视频号"、"视频号发布"、"publish channels"、"上传到视频号"。
  DO NOT TRIGGER when: 其他平台发布、纯视频制作。
argument-hint: "<视频路径> [描述] [话题...] [短标题]"
---

# /publish-channels — 发布视频到微信视频号

通道：视频号 = tab 3 → `/tmp/wp-cmd-3.js` `/tmp/wp-result-3.txt`

## 脚本调用（推荐）

所有操作已封装到 `scripts/channels.sh`，一次一个动作：

```bash
bash scripts/channels.sh open                         # 打开发布页
bash scripts/channels.sh upload "$VIDEO"               # 上传视频(Shadow DOM)
bash scripts/channels.sh stop_video                    # 立即暂停视频播放！
bash scripts/channels.sh desc "描述 #话题1 #话题2"     # 填描述
bash scripts/channels.sh short_title "短标题"          # 填短标题
bash scripts/channels.sh collection                    # 添加推荐合集
bash scripts/channels.sh original                      # 声明原创（强制！不声明不发）
bash scripts/channels.sh publish                       # 发表（需管理员扫码）
bash scripts/channels.sh check                         # 检查结果
bash scripts/channels.sh screenshot                    # 截图
```

**每个动作之间 AI 自己 sleep + screenshot 验证。** 不要连续调用不等结果。

## 核心规则

1. **无界 Shadow DOM** — 视频号用 wujie 微前端，所有表单元素在 `document.querySelector('wujie-app').shadowRoot` 里
2. **主文档 vs Shadow DOM** — 侧边栏在主文档，表单在 shadow DOM，确认弹窗在主文档
3. **描述编辑器是 `.input-editor`** — 不是通用 `[contenteditable]`。`execCommand('insertText')` 可用（2026-04-02 实测）
4. **话题标签写在描述里** — `#话题名` 直接写在描述文本中，视频号自动识别
5. **封面自动提取** — 上传后自动生成封面，无需手动操作
6. **发表需管理员扫码** — 非管理员账号可以填写所有字段但无法发表。发表时会弹出"管理员本人验证"二维码，需微信扫码。这是平台限制，AI 无法绕过

## Shadow DOM 访问模板

```javascript
var sr = document.querySelector('wujie-app').shadowRoot;
var element = sr.querySelector('选择器');
```

## 发布流程

### 1. 导航到发布页

```bash
echo "goto https://channels.weixin.qq.com/platform/post/create" > /tmp/wp-cmd-3.js
sleep 5
```

### 2. 上传视频

```bash
cp "$VIDEO" /tmp/channels-upload.mp4
echo "/tmp/channels-upload.mp4" > /tmp/wp-upload-path-3.txt

# 点击 Shadow DOM 内的 file input
cat > /tmp/wp-cmd-3.js << 'JS'
(function(){
    var sr = document.querySelector('wujie-app').shadowRoot;
    var inp = sr.querySelector('input[type=file]');
    if(!inp) return "no file input";
    inp.click();
    return "clicked";
})()
JS
sleep 3

# 验证上传
ls /tmp/wp-upload-path-3.txt 2>/dev/null && echo "FAILED" || echo "OK"
```

### 3. 等上传完成

```bash
for i in $(seq 1 15); do
    cat > /tmp/wp-cmd-3.js << 'JS'
(function(){
    var sr = document.querySelector('wujie-app').shadowRoot;
    if(sr.textContent.indexOf('上传成功') >= 0 || sr.textContent.indexOf('重新上传') >= 0) return "COMPLETE";
    var videos = sr.querySelectorAll('video');
    if(videos.length > 0) return "COMPLETE";
    return "uploading";
})()
JS
    sleep 3
    grep -q "COMPLETE" /tmp/wp-result-3.txt && break
done
```

### 4. 填描述（含话题标签）

**描述编辑器选择器是 `.input-editor`（非通用 `[contenteditable]`）。**

**方法 A: execCommand（实测可用 2026-04-02）：**

```bash
cat > /tmp/wp-cmd-3.js << 'JS'
(function(){
    var sr = document.querySelector('wujie-app').shadowRoot;
    var ed = sr.querySelector('.input-editor');
    if(!ed) return "no editor";
    ed.focus();
    document.execCommand('insertText', false, '视频描述内容 #话题1 #话题2');
    return "ok, len:" + ed.innerText.trim().length;
})()
JS
sleep 2
```

**方法 B: click 坐标 + paste 命令（备选，更可靠）：**

```bash
# 先用 JS 获取编辑器坐标
cat > /tmp/wp-cmd-3.js << 'JS'
(function(){
    var sr = document.querySelector('wujie-app').shadowRoot;
    var ed = sr.querySelector('.input-editor');
    if(!ed) return "no editor";
    var rect = ed.getBoundingClientRect();
    return Math.round(rect.x+rect.width/2)+","+Math.round(rect.y+10);
})()
JS
sleep 2
# 读取坐标后 click + paste
echo 'click X Y' > /tmp/wp-cmd-3.js   # 替换为实际坐标
sleep 2
echo 'paste 描述内容' > /tmp/wp-cmd-3.js
sleep 3
```

**方法 C: innerHTML 构造话题标签（蓝色高亮）：**

```javascript
ed.innerHTML = '描述文字 ' +
    '<span class="hl topic" data-type="topic">#话题1</span> ' +
    '<span class="hl topic" data-type="topic">#话题2</span>';
ed.dispatchEvent(new Event('input', {bubbles: true}));
```

**验证描述是否填入：**
```bash
cat > /tmp/wp-cmd-3.js << 'JS'
(function(){
    var sr = document.querySelector('wujie-app').shadowRoot;
    var ed = sr.querySelector('.input-editor');
    return ed ? "len:" + ed.innerText.trim().length : "no editor";
})()
JS
```

### 5. 填短标题（6-16字）

```bash
cat > /tmp/wp-cmd-3.js << 'JS'
(function(){
    var sr = document.querySelector('wujie-app').shadowRoot;
    var inp = sr.querySelector('input[placeholder*="概括视频主要内容"]');
    if(!inp) return "no short title";
    var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(inp, '短标题内容');
    inp.dispatchEvent(new Event('input', {bubbles: true}));
    return "ok";
})()
JS
sleep 1
```

### 6. 添加到合集（可选）

视频号会自动推荐相关合集（如 "ClaudeCode讲解CC源码"）。点击推荐合集旁的"添加"即可。

```bash
cat > /tmp/wp-cmd-3.js << 'JS'
(function(){
    var sr = document.querySelector('wujie-app').shadowRoot;
    // 精确定位推荐合集的"添加"链接
    var btn = sr.querySelector('a.add-btn');
    if(btn) { btn.click(); return "ok: added to collection"; }
    return "no recommended collection";
})()
JS
sleep 2
```

### 7. 保存草稿 / 发表

```bash
# 保存草稿（安全）
cat > /tmp/wp-cmd-3.js << 'JS'
(function(){
    var sr = document.querySelector('wujie-app').shadowRoot;
    var btns = sr.querySelectorAll('button');
    for(var i=0; i<btns.length; i++){
        if(btns[i].textContent.trim() === '保存草稿' && btns[i].offsetWidth > 0){
            btns[i].click();
            return "ok";
        }
    }
    return "not found";
})()
JS
sleep 3

# 或直接发表
cat > /tmp/wp-cmd-3.js << 'JS'
(function(){
    var sr = document.querySelector('wujie-app').shadowRoot;
    var btns = sr.querySelectorAll('button');
    for(var i=0; i<btns.length; i++){
        if(btns[i].textContent.trim() === '发表' && btns[i].offsetWidth > 0){
            btns[i].click();
            return "ok";
        }
    }
    return "not found";
})()
JS
sleep 5
```

### 8. 删除草稿（测试用）

```bash
# 导航到草稿箱（从侧边栏点击，侧边栏在主文档里）
echo '(function(){var els=document.querySelectorAll("*");for(var i=0;i<els.length;i++){if(els[i].textContent.trim()==="草稿箱"&&els[i].offsetWidth>0&&els[i].childNodes.length<=3){els[i].click();return "ok";}}return "no";})()' > /tmp/wp-cmd-3.js
sleep 4

# 点击删除（shadow DOM 里）
cat > /tmp/wp-cmd-3.js << 'JS'
(function(){
    var sr = document.querySelector('wujie-app').shadowRoot;
    var els = sr.querySelectorAll('*');
    for(var i=0; i<els.length; i++){
        if(els[i].textContent.trim() === '删除' && els[i].offsetWidth > 0 && els[i].childNodes.length <= 3){
            els[i].click();
            return "ok";
        }
    }
    return "not found";
})()
JS
sleep 2

# 确认删除（主文档里的弹窗）
echo '(function(){var b=document.querySelectorAll("button");for(var i=0;i<b.length;i++){if(b[i].textContent.trim()==="确定"&&b[i].offsetWidth>0){b[i].click();return "ok";}}return "no";})()' > /tmp/wp-cmd-3.js
sleep 3
```

## 输入方式总结

| 内容 | 方法 | DOM 位置 | 不抢键盘 |
|------|------|---------|---------|
| 描述+话题 | innerText + dispatch input | Shadow DOM | ✅ |
| 短标题 | nativeInputValueSetter | Shadow DOM | ✅ |
| 上传 | input[type=file].click() | Shadow DOM | ✅ |
| 按钮（表单） | querySelector + click | Shadow DOM | ✅ |
| 按钮（确认弹窗） | querySelector + click | **主文档** | ✅ |
| 侧边栏导航 | querySelector + click | **主文档** | ✅ |
| 封面 | 自动提取 | — | ✅ |

## 视频规格

| 属性 | 要求 |
|------|------|
| 时长 | ≤8小时 |
| 大小 | ≤20GB |
| 分辨率 | ≥720p |
| 码率 | ≤10Mbps |
| 格式 | MP4 |
| 短标题 | 6-16 字 |

## 与其他平台的关键区别

| 项目 | 抖音 | B站 | 视频号 |
|------|------|-----|--------|
| DOM | 普通 | 普通 | **Shadow DOM (wujie)** |
| 描述 | execCommand | contenteditable | **innerText** |
| 话题 | #话题+空格（蓝色） | input+Enter | **innerHTML span.hl.topic** |
| 标题 | 有（≤30字） | 有（≤80字） | **短标题（6-16字）** |
| 封面 | 智能推荐+手选 | 自动提取 | 自动提取 |
| 合集 | 手动 | 需认证 | **推荐合集 `a.add-btn`** |
| 确认弹窗 | 主文档 | 主文档 | **主文档** |

## 防封要点（风险等级：低）

视频号对自动化相对宽松，主要靠内容审核而非行为检测。封号几乎都是内容违规导致。

**随机延迟：**

```bash
wp_sleep() { sleep $(python3 -c "import random; print(round(random.uniform(${1:-1.5}, ${2:-3.5}), 1))"); }
```

**频率限制：**
- 每天 ≤3 条
- 内容不能有诱导加微信/关注的话术

**已有保护：**
- WKWebView 无自动化指纹
- 打字速度已随机化（55-130ms/字）
- 点击坐标已加 ±1px 抖动
- 持久 cookie = 真人会话

## 封面

**视频自带封面帧，不需要手动设置。** 视频号自动提取，默认即可。

## 发布后自验证（强制）

验证方式：发表成功后自动跳视频管理页 → 截图确认第一条 + 合集 tab 确认内容数 +1

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
