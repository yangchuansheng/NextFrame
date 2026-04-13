---
name: publish-xiaohongshu
description: >
  发布视频到小红书。通过 automedia tab 1 JS 注入操作创作服务平台。
  自动处理：视频上传、标题描述（带换行）、话题选择（下拉框轮询点选）。
  TRIGGER: "发小红书"、"发到小红书"、"小红书发布"、"publish xiaohongshu"、"publish xhs"。
  DO NOT TRIGGER when: 其他平台发布、纯视频制作。
argument-hint: "<视频路径> [标题] [描述] [话题...]"
---

# /publish-xiaohongshu — 发布视频到小红书

## 脚本调用（推荐）

所有操作已封装到 `scripts/xhs.sh`，一次一个动作：

```bash
bash scripts/xhs.sh open                    # 打开上传页
bash scripts/xhs.sh upload "$VIDEO"         # 上传视频
bash scripts/xhs.sh title "标题"            # 填标题
bash scripts/xhs.sh desc "第一段\n\n第二段"  # 填描述
bash scripts/xhs.sh topic "AI"              # 加话题（每次一个）
bash scripts/xhs.sh publish                 # 发布
bash scripts/xhs.sh check                   # 检查结果
bash scripts/xhs.sh screenshot              # 截图
```

**每个动作之间 AI 自己 sleep + screenshot 验证。** 不要连续调用不等结果。

## 前置条件

1. `automedia` 在运行（多通道版）
2. 小红书已登录（tab 1 cookie 持久化）
3. 视频 MP4 准备好（1080x1920 竖屏即可，小红书不需要额外比例转换）

## 命令通道（tab 1 专用）

| 文件 | 用途 |
|------|------|
| `/tmp/wp-cmd-1.js` | 命令（JS / `screenshot` / `goto` / `waitfor` / `type` / `key`）|
| `/tmp/wp-result-1.txt` | 结果 |
| `/tmp/wp-screenshot-1.png` | 截图 |
| `/tmp/wp-upload-path-1.txt` | 文件上传路径注入 |

辅助函数：

```bash
xhs() { echo "$1" > /tmp/wp-cmd-1.js; sleep "${2:-1}"; cat /tmp/wp-result-1.txt; }
xhs_js() { cat > /tmp/wp-cmd-1.js; sleep "${2:-1}"; cat /tmp/wp-result-1.txt; }
xhs_shot() { echo "screenshot" > /tmp/wp-cmd-1.js; sleep 2; }
```

## 完整发布流程

### 1. 打开上传页

```bash
echo "goto https://creator.xiaohongshu.com/publish/publish?source=official" > /tmp/wp-cmd-1.js
sleep 6
```

### 2. 上传视频

```bash
echo "/path/to/video.mp4" > /tmp/wp-upload-path-1.txt
sleep 1
echo '(function(){ document.querySelector("input[type=file]").click(); return "ok"; })()' > /tmp/wp-cmd-1.js
sleep 12  # 等上传完成
```

**等待上传完成（用 waitfor 代替轮询）：**

```bash
echo "waitfor .tiptap 30000" > /tmp/wp-cmd-1.js   # 编辑器出现 = 上传完成可以填表
sleep 15; cat /tmp/wp-result-1.txt                  # waitfor 会阻塞直到元素出现或超时
```

**注意：** 路径建议用 `/tmp/` 下的文件，长路径偶尔有问题。先 `cp video.mp4 /tmp/xhs-upload.mp4`。

### 3. 填标题（≤20字效果最好）

React 控制的 input，必须用 `nativeInputValueSetter`：

```bash
cat > /tmp/wp-cmd-1.js << 'JS'
(function(){
    var input = document.querySelector('input[placeholder="填写标题会有更多赞哦"]');
    if(!input) return "no title input";
    input.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,"标题内容");
    input.dispatchEvent(new Event("input",{bubbles:true}));
    return "title ok";
})()
JS
```

### 4. 填描述（HTML 粘贴保留换行）

**编辑器是 Tiptap/ProseMirror。`execCommand("insertLineBreak")` 的换行发布后会丢失。**

**正确方法：用 ClipboardEvent 粘贴 HTML `<p>` 标签：**

```bash
cat > /tmp/wp-cmd-1.js << 'JS'
(function(){
    var ed = document.querySelector(".tiptap.ProseMirror");
    if(!ed) return "no editor";
    ed.focus();
    document.execCommand("selectAll");
    document.execCommand("delete");

    var html = "<p>第一段内容</p><p><br></p><p>第二段内容</p><p>第三段内容</p>";
    var plain = "第一段内容\n\n第二段内容\n第三段内容";
    var dt = new DataTransfer();
    dt.setData("text/html", html);
    dt.setData("text/plain", plain);
    ed.dispatchEvent(new ClipboardEvent("paste",{bubbles:true,cancelable:true,clipboardData:dt}));

    return "desc ok, " + ed.querySelectorAll("p").length + " paragraphs";
})()
JS
```

**关键点：**
- 每个 `<p>` = 一段
- `<p><br></p>` = 空行（视觉分隔）
- ProseMirror 会解析粘贴的 HTML 并正确更新内部状态
- 发布后换行保留

### 5. 添加话题（从下拉框选中，轮询等待）

**小红书话题必须从下拉框点选，纯文本 `#话题` 无效。**

流程：点话题按钮 → 输入关键词 → 轮询等下拉出现 → 点选第一个匹配项。

```bash
cat > /tmp/wp-cmd-1.js << 'JS'
(function(){
    var ed = document.querySelector(".tiptap.ProseMirror");
    if(!ed) return "no editor";
    ed.focus();
    var sel = window.getSelection();
    sel.selectAllChildren(ed);
    sel.collapseToEnd();

    function addTopic(keyword, cb) {
        var btn = document.querySelector("button.topic-btn");
        if(!btn) { cb(); return; }
        btn.click();
        setTimeout(function(){
            document.execCommand("insertText", false, keyword);
            // 轮询等下拉框出现（每 200ms 检查，最多 4s）
            var n = 0;
            var timer = setInterval(function(){
                n++;
                var items = document.querySelectorAll("div.item");
                for(var i=0; i<items.length; i++){
                    if(items[i].textContent.indexOf("#") >= 0
                       && items[i].textContent.indexOf(keyword) >= 0
                       && items[i].offsetWidth > 0) {
                        items[i].dispatchEvent(new MouseEvent("mousedown",{bubbles:true}));
                        items[i].dispatchEvent(new MouseEvent("mouseup",{bubbles:true}));
                        items[i].dispatchEvent(new MouseEvent("click",{bubbles:true}));
                        clearInterval(timer);
                        setTimeout(cb, 300);
                        return;
                    }
                }
                if(n > 20) { clearInterval(timer); cb(); }
            }, 200);
        }, 400);
    }

    // 链式添加多个话题
    addTopic("AI", function(){
        addTopic("程序员", function(){
            document.title = "TOPICS_DONE";
        });
    });
    return "started";
})()
JS
sleep 10  # 等话题链完成
echo "document.title" > /tmp/wp-cmd-1.js; sleep 1
# 验证：结果应为 "ok: TOPICS_DONE"
```

**话题选择要点：**
- `button.topic-btn` 是编辑器底栏的"话题"按钮，点击后插入 `#` 并弹下拉
- 下拉项是 `div.item`，文本格式 `#关键词XX亿人浏览`
- 必须用 mousedown + mouseup + click 三连发才能触发选择
- 轮询比固定 setTimeout 可靠得多（网络延迟不确定）
- 话题之间间隔 300ms 防止冲突

### 6. 发布

```bash
cat > /tmp/wp-cmd-1.js << 'JS'
(function(){
    var btns = document.querySelectorAll("button");
    for(var i=0; i<btns.length; i++){
        if(btns[i].textContent.trim() === "发布" && !btns[i].disabled){
            btns[i].click();
            return "published";
        }
    }
    return "btn not found";
})()
JS
sleep 5
echo "window.location.href" > /tmp/wp-cmd-1.js; sleep 1
# 成功标志：URL 含 publish/success
```

### 7. 验证

```bash
# 方法 1：检查 URL（不一定跳 success 页）
echo "window.location.href" > /tmp/wp-cmd-1.js; sleep 1
cat /tmp/wp-result-1.txt | grep -qE "publish/success|published=true" && echo "SUCCESS"

# 方法 2（更可靠）：发布成功后页面回到上传页（有"上传视频"按钮）
echo '(function(){return document.querySelector("input[type=file]")?"UPLOAD_PAGE":"OTHER";})()' > /tmp/wp-cmd-1.js
sleep 1
# UPLOAD_PAGE = 已发布成功，回到上传页面
```

**实测发现（2026-04-02）：** 发布成功后页面直接回到上传页面（`creator.xiaohongshu.com/publish/publish`），不一定经过 success 页。用方法 2 更可靠。

## 最佳实践：一气呵成

**小红书发布页有空闲超时（约 30s），超时页面会跳回首页。**

把 步骤 3+4+5 合并到一个 JS 执行，用 setTimeout 链串话题，总耗时控制在 15s 内。
步骤 5 完成后立刻执行步骤 6 发布。不要中间截图检查。

## 视频规格

| 属性 | 要求 |
|------|------|
| 尺寸 | 1080x1920（9:16 竖屏）|
| 格式 | MP4，H.264 |
| 大小 | 文件 ≤ 5GB |
| 时长 | ≤ 15 分钟 |

**小红书不需要像抖音那样转 9:19.5。** 标准 9:16 直接上传即可。

## 合集功能（已验证可用）

### 创建合集

在发布页/编辑页滚到"内容设置"区域，点"选择合集" → 下拉里选"创建合集"：

```bash
# 滚到合集区域并打开下拉
cat > /tmp/wp-cmd-1.js << 'JS'
(function(){
    var all = document.querySelectorAll("*");
    for(var el of all) {
        if(el.textContent.trim() === "选择合集" && el.offsetWidth > 0 && el.children.length <= 1) {
            el.scrollIntoView({block:"center"});
            el.click();
            return "opened";
        }
    }
    return "not found";
})()
JS
```

然后点"创建合集" → 弹窗填名称和简介 → 点"创建并加入"。

**注意：**
- 弹窗里的"创建并加入"按钮检查 isTrusted，JS click 无效。用 `click x y` 命令发真实鼠标事件。
- 弹窗内的 input/textarea 是 React 控件，用 `nativeInputValueSetter` 填值（`type` 命令走 firstResponder 可能不到达 modal 内的 input）。
- 上传后可能弹出"章节编辑"弹窗，需先关闭再继续。

### 加入已有合集

发布时在"选择合集"下拉里直接点已有合集名即可（JS click 对下拉项有效）。

```bash
cat > /tmp/wp-cmd-1.js << 'JS'
(function(){
    var all = document.querySelectorAll("*");
    for(var el of all) {
        if(el.textContent.trim() === "AI视频制作教程" && el.offsetWidth > 0 && el.children.length === 0) {
            el.click(); return "selected";
        }
    }
    return "not found";
})()
JS
```

## 已知问题

| 问题 | 状态 | 解法 |
|------|------|------|
| 描述换行丢失 | **已修复** | HTML `<p>` 粘贴代替 execCommand |
| 话题选择不稳定 | **已修复** | 轮询等待下拉框代替固定延时 |
| 页面空闲跳转 | 已规避 | 步骤合并，控制总耗时 < 15s |
| 上传路径偶尔失败 | 已规避 | 先 cp 到 /tmp/ 再上传 |
| ProseMirror 编辑器选择器 | 已确认 | `.tiptap.ProseMirror` |
| 上传后弹章节编辑弹窗 | 已知 | 检测到就关闭（点 X 或 取消） |
| 创建合集弹窗按钮 isTrusted | **已修复** | 用 `click x y` 命令 |
| 成功 URL 变化 | 已处理 | 检查 publish/success 或 published=true |

## URL 地图

| 页面 | URL |
|------|-----|
| 首页 | `creator.xiaohongshu.com/new/home` |
| 发布 | `creator.xiaohongshu.com/publish/publish?source=official` |
| 发布成功 | `creator.xiaohongshu.com/publish/success?...` |
| 笔记管理 | 侧边栏"笔记管理"点击（SPA 路由，非独立 URL） |

## 与抖音的区别

| 维度 | 抖音 (tab 0) | 小红书 (tab 1) |
|------|-------------|---------------|
| 通道 | `/tmp/wp-cmd-0.js` | `/tmp/wp-cmd-1.js` |
| 视频比例 | 需转 9:19.5 (1080x2340) | 标准 9:16 直接上传 |
| 描述编辑器 | contenteditable div | Tiptap/ProseMirror |
| 换行方法 | execCommand insertLineBreak | HTML `<p>` 粘贴 |
| 话题输入 | 逐字打 + 空格确认 | 下拉框轮询点选 |
| 标题 input | nativeInputValueSetter | nativeInputValueSetter（相同） |
| 空闲超时 | 无明显 | ~30s 跳回首页 |
| 合集 | 网页端可管理 | 只能 App 创建 |

## 防封要点（风险等级：高 — 四平台中最高）

小红书检测最严：200+ 维度行为分析，2025 上半年封了 1000 万+ 黑灰产账号。无论什么技术手段，行为层面的风险很难完全规避。

**随机延迟（必须用，不能用固定 sleep）：**

```bash
# 高斯分布随机延迟 — 比均匀分布更像人类
wp_sleep() { sleep $(python3 -c "import random; print(round(max(${1:-2}, random.gauss(${2:-3}, 0.8)), 1))"); }
```

**严格频率限制：**
- 每天最多 1 条（不是 3 条！）
- 两天之间的发布时间不固定（加 ±1 小时随机）
- 同一台 Mac 只操作一个小红书账号
- 同一 IP 不操作多个账号

**行为模拟（对小红书特别重要）：**
- 发布前在平台上"浏览" 30-60 秒（goto 首页，等待，再去发布页）
- 不要每次打开 webview 就直奔发布页
- 标题描述话题每条都要有差异，不能模板化
- 步骤间延迟要不均匀（人类不会等固定时间）

**已有保护：**
- WKWebView 无 WebDriver/CDP 指纹
- 打字速度已随机化（55-130ms/字，非固定 80ms）
- 点击坐标已加 ±1px 抖动
- 持久 cookie = 真人登录会话

**早期预警信号：**
- 笔记浏览量突然下降（限流）→ 立即停止自动化 7 天
- 收到"账号异常"通知 → 停止自动化，手动操作恢复

**考虑替代方案：** 如果发布频率需要 >1 条/天，建议改为手动发布小红书，只自动化其他三个平台

## 封面

**视频自带封面帧，不需要手动设置。** 上传后平台自动提取，默认即可。不要点"选择封面"按钮。

## 发布后自验证（强制）

验证方式：check 返回 SUCCESS 后，点侧边栏"笔记管理" → 截图看第一条

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
