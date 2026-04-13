---
name: publish-douyin
description: >
  发布视频到抖音。通过 automedia 操作创作者中心，模拟人类完成发布。
  自动处理：比例转换(9:19.5)、标题描述、话题标签（蓝色识别）、封面、发布。
  TRIGGER: "发抖音"、"发到抖音"、"抖音发布"、"publish douyin"、"上传到抖音"。
  DO NOT TRIGGER when: 其他平台发布、纯视频制作。
argument-hint: "<视频路径> [标题] [描述] [话题...]"
---

# /publish-douyin — 发布视频到抖音

通道：抖音 = tab 0 → `/tmp/wp-cmd-0.js` `/tmp/wp-result-0.txt`

## 脚本调用（推荐）

所有操作已封装到 `scripts/douyin.sh`，一次一个动作：

```bash
bash scripts/douyin.sh pad "$VIDEO"          # 视频 pad 到 9:19.5
bash scripts/douyin.sh open                  # 打开上传页
bash scripts/douyin.sh upload                # 上传（默认 /tmp/video-padded.mp4）
bash scripts/douyin.sh wait_page             # 等跳转到发布页
bash scripts/douyin.sh dismiss               # 关弹窗
bash scripts/douyin.sh tag "程序员"          # 先加标签（空编辑器上！）
bash scripts/douyin.sh tag "AI编程"          # 每次一个
bash scripts/douyin.sh desc "描述内容"       # 再加正文
bash scripts/douyin.sh title "标题"          # 填标题
bash scripts/douyin.sh wait_upload           # 等上传完成
bash scripts/douyin.sh cover                 # 智能推荐封面
bash scripts/douyin.sh publish               # 发布
bash scripts/douyin.sh check                 # 检查结果
bash scripts/douyin.sh screenshot            # 截图
```

**关键顺序：先 tag 再 desc！** 标签必须在空编辑器上加。
**每个动作之间 AI 自己 sleep + screenshot 验证。** 不要连续调用不等结果。

## 核心规则

1. **写错了不要在页面上清空重试** — Slate 编辑器内部状态清不掉。回到上传页重新上传视频，拿到新鲜的发布页。
2. **正文用 JS 写** — `execCommand('insertParagraph')` + `execCommand('insertText')`
3. **话题标签用 type 命令** — 先 JS 点"#添加话题"按钮 → `type 标签名` → `key space` 确认。这走 firstResponder.insertText 管线，编辑器能识别为蓝色话题。不抢键盘。
4. **每次发布必须从上传页开始** — `goto upload → 上传文件 → 跳转到新鲜发布页`

## 发布流程

### 0. 视频预处理

```bash
BG=$(ffmpeg -y -ss 5 -i "$VIDEO" -vframes 1 -vf "crop=10:10:0:0" \
  -f rawvideo -pix_fmt rgb24 pipe: 2>/dev/null | xxd -l 3 -p)
ffmpeg -y -i "$VIDEO" -vf "pad=1080:2340:0:210:0x${BG}" \
  -c:v libx264 -crf 18 -preset fast -c:a copy /tmp/video-padded.mp4
```

### 1. 上传视频

```bash
echo "goto https://creator.douyin.com/creator-micro/content/upload" > /tmp/wp-cmd-0.js; sleep 4
echo "/tmp/video-padded.mp4" > /tmp/wp-upload-path.txt
echo '(function(){var i=document.querySelector("input[type=file]");if(i){i.click();return "ok";}return "no";})()' > /tmp/wp-cmd-0.js
# 轮询等跳转
for i in $(seq 1 15); do
  sleep 2; echo "window.location.href" > /tmp/wp-cmd-0.js; sleep 1
  grep -q "content/post/video\|content/publish" /tmp/wp-result-0.txt && break
done
```

### 2. 关弹窗

```bash
sleep 2
echo '(function(){var c=0;document.querySelectorAll("button,span,div").forEach(function(e){var t=e.textContent.trim();if((t==="完成"||t==="我知道了")&&e.offsetWidth>0&&e.offsetHeight<100){e.click();c++;}});return c;})()' > /tmp/wp-cmd-0.js
sleep 1
```

### 3. 填标题（≤30字）

```bash
echo '(function(){var input=document.querySelector("input[placeholder*=\"填写作品标题\"]");if(!input)return"no";var s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;s.call(input,"标题");input.dispatchEvent(new Event("input",{bubbles:true}));return"ok";})()' > /tmp/wp-cmd-0.js
sleep 1
```

React input 必须用 nativeInputValueSetter。

### 4. 填描述正文（JS 粘贴）

```bash
cat > /tmp/wp-cmd-0.js << 'JS'
(function(){
    var ed=document.querySelector("[contenteditable=true]");
    if(!ed) return "no";
    ed.focus(); ed.innerHTML="";
    var lines=["第一行核心观点","","要点一","补充","","要点二","补充"];
    for(var i=0;i<lines.length;i++){
        if(i>0) document.execCommand('insertParagraph',false,null);
        if(lines[i]) document.execCommand('insertText',false,lines[i]);
    }
    return "ok";
})()
JS
sleep 2
```

空行 = `insertParagraph` 两次（lines 数组里放空字符串）。

### 5. 填话题标签（逐字输入，蓝色识别）

**必须在空编辑器上先加标签，再加正文。** `cmd+right` 在有内容时会跳到整行末尾。

```bash
add_tag() {
    local TAG="$1"
    # 1. JS 点"#添加话题"按钮（插入 #）
    echo '(function(){var a=document.querySelectorAll("*");for(var i=0;i<a.length;i++){if(a[i].textContent.trim()==="#添加话题"&&a[i].childNodes.length<=3&&a[i].offsetWidth>0){a[i].click();return "ok";}}return "no";})()' > /tmp/wp-cmd-0.js
    sleep 2
    # 2. JS 重新聚焦编辑器（按钮点击会滚动/失焦）
    echo '(function(){var ed=document.querySelector("[contenteditable=true]");if(ed){ed.scrollIntoView({block:"center"});ed.focus();}return "ok";})()' > /tmp/wp-cmd-0.js
    sleep 1
    # 3. 逐字输入：每字前 cmd+right 把光标移到 # 后面
    for ch in $(echo "$TAG" | grep -o .); do
        echo "key cmd+right" > /tmp/wp-cmd-0.js; sleep 0.3
        echo "type $ch" > /tmp/wp-cmd-0.js; sleep 0.3
    done
    # 4. 空格确认 → 变蓝
    echo "key space" > /tmp/wp-cmd-0.js
    sleep 2
}

add_tag "程序员"
add_tag "ClaudeCode"
add_tag "AI编程"
```

**已验证 5 个标签全蓝（中文+英文+混合）。不用内置 addtag 命令。**

**踩坑总结（2026-04-02 最终验证）：**
- `type #程序员` 整串输入 → 字符反序（Slate `#` 节点移光标）
- `addtag` 内置命令 → CGEvent 时序不稳定
- `key cmd+right` → 跳出 mention 节点边界 → 字符在节点外 → 不蓝
- **`key end` → 光标留在 mention 节点内 → 字符正确进入 → 变蓝！**
- **唯一可靠方案：JS 点按钮 + 每字前 `key end` + `type 单字` + `key space`**
- 3 个标签全蓝验证通过（中文 + 英文混合）

### 6. 等上传完成

```bash
for i in $(seq 1 30); do
  echo '(function(){if(document.body.innerText.indexOf("重新上传")>=0)return "COMPLETE";return "uploading";})()' > /tmp/wp-cmd-0.js
  sleep 3; grep -q "COMPLETE" /tmp/wp-result-0.txt && break
done
```

### 7. 封面（默认不操作）

**视频自带封面帧，默认即可。** 以下操作仅在需要更换封面时使用：

```bash
echo '(function(){var a=document.querySelectorAll("span,div");for(var i=0;i<a.length;i++){if(a[i].textContent.trim()==="智能推荐封面"&&a[i].offsetWidth>0){a[i].click();return "ok";}}return "no";})()' > /tmp/wp-cmd-0.js
sleep 4
echo '(function(){var c=document.querySelectorAll("[class*=recommendCover-]");if(c.length>0){c[0].click();return "ok";}return "no";})()' > /tmp/wp-cmd-0.js
sleep 3
# 确认弹窗（可能需要点两次）
for i in 1 2; do
  echo '(function(){var b=document.querySelectorAll("button");for(var i=b.length-1;i>=0;i--){if(b[i].textContent.trim()==="确定"&&b[i].offsetWidth>0&&b[i].offsetHeight<60){b[i].click();return "ok";}}return "no";})()' > /tmp/wp-cmd-0.js
  sleep 2
done
# 验证
echo '(function(){return document.body.innerText.indexOf("缺失")>=0?"MISSING":"OK";})()' > /tmp/wp-cmd-0.js
```

### 8. 发布

```bash
echo '(function(){var b=document.querySelectorAll("button");for(var i=0;i<b.length;i++){if(b[i].textContent.trim()==="发布"&&!b[i].disabled){b[i].click();return "ok";}}return "no";})()' > /tmp/wp-cmd-0.js
sleep 8
echo "window.location.href" > /tmp/wp-cmd-0.js; sleep 1
# 成功 = URL 包含 content/manage
```

## 输入方式总结

| 内容 | 方法 | 不抢键盘 |
|------|------|---------|
| 标题 | JS nativeInputValueSetter | ✅ |
| 描述正文 | JS execCommand insertParagraph + insertText | ✅ |
| 话题标签 | JS 点"#添加话题" → `type 标签名` → `key space` | ✅ |
| 按钮点击 | JS querySelector + click | ✅ |
| 封面 | JS 点"智能推荐" + 选第一个 + 确定 | ✅ |

## 视频规格

| 属性 | 要求 |
|------|------|
| 制作尺寸 | 1080x1920（9:16）|
| **上传尺寸** | **1080x2340（9:19.5，自动转）** |
| 格式 | MP4，H.264 |
| 大小 | ≤16GB |

## 防封要点（风险等级：中）

抖音有设备指纹 + 行为分析，但 WKWebView 绕过了最常见的 WebDriver 检测。主要风险在行为层面。

**随机延迟（必须用，替代固定 sleep）：**

```bash
wp_sleep() { sleep $(python3 -c "import random; print(round(random.uniform(${1:-1.5}, ${2:-4}), 1))"); }
```

**频率限制：**
- 每天 ≤2 条（保守），绝不超过 3 条
- 两条之间间隔 ≥2 小时
- 不要每天固定时间发（加 ±30 分钟随机偏移）

**行为模拟：**
- 标题描述每条不同
- 发布前后在平台上停留 10-30 秒
- 同一台 Mac 只操作一个抖音账号

**已有保护：**
- WKWebView 无自动化指纹
- 打字速度已随机化（55-130ms/字）
- 点击坐标已加 ±1px 抖动

## 清空编辑器

```bash
echo '(function(){var ed=document.querySelector("[contenteditable=true]");ed.focus();document.execCommand("selectAll");document.execCommand("delete");return "len:"+ed.innerText.trim().length;})()' > /tmp/wp-cmd-0.js
```

用 `selectAll + delete`（走 Slate 的 command 接口）。清完后检查 `len` 是否为 0。

**如果清不干净（len > 0）**：回上传页重新上传视频，拿新鲜发布页。

## 发布后自验证（强制）

验证页面：`goto https://creator.douyin.com/creator-micro/content/manage` → 截图看第一条

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
