# AutoMedia

AI 自动发布工具。通过 WKWebView 操作各平台创作者中心，模拟人类完成内容发布。

## 平台

| Tab | 平台 | 脚本 | 发布 skill |
|-----|------|------|-----------|
| 0 | 抖音 | `scripts/douyin.sh` | `/publish-douyin` |
| 1 | 小红书 | `scripts/xhs.sh` | `/publish-xiaohongshu` |
| 2 | B站 | `scripts/bili.sh` | `/publish-bilibili` |
| 3 | 视频号 | `scripts/channels.sh` | `/publish-channels` |
| 4 | 公众号 | `scripts/mp.sh` | `/publish-mp` |
| 5 | 快手 | `scripts/kuaishou.sh` | `/publish-kuaishou` |
| 6 | 知乎 | `scripts/zhihu.sh` | `/publish-zhihu` |

## Skills

| Skill | 用途 |
|-------|------|
| `automedia-setup` | 启动、部署、检查登录、排障 |
| `publish-douyin` | 发抖音（视频，需 9:19.5 pad） |
| `publish-xiaohongshu` | 发小红书（视频） |
| `publish-bilibili` | 发B站（视频） |
| `publish-channels` | 发视频号（视频，Shadow DOM） |
| `publish-mp` | 发公众号（图文，需扫码） |
| `publish-kuaishou` | 发快手（视频，封面在 iframe） |
| `publish-zhihu` | 发知乎（视频，React，16:9 横屏） |

## 原生交互原则（铁律，不可违反）

**所有用户可感知的操作必须走原生 NSEvent（`isTrusted: true`）。JS 只用于读数据和定位元素。**

违反 = 平台检测到自动化 = 封号/验证码/session 失效。没有例外。

### 禁止清单

| 禁止 | 原因 | 替代 |
|------|------|------|
| `element.click()` | `isTrusted: false`，反爬一查一个准 | `wp_clickel` / `wp_jsclick` |
| `dispatchEvent(new Event/MouseEvent/...)` | 假事件，`isTrusted: false` | `wp_clickel` / `wp_inputel` |
| `execCommand('insertText')` | 废弃 API + JS focus 不是真实焦点 | `wp_inputel` |
| `element.focus()` | JS 假焦点，不触发键盘管线 | `wp_clickel`（native click 拿焦点） |
| `nativeValueSetter + dispatchEvent` | 虽然绕过了 React，但 dispatchEvent 仍是假事件 | `wp_inputel` |

### 原生命令表（必须用这些）

| 命令 | 用途 | 原理 |
|------|------|------|
| `wp_clickel TAB "selector"` | 点击元素 | JS 取坐标 → NSEvent mouseDown/mouseUp |
| `wp_clickel TAB "text:发布"` | 按文字点击 | JS 找文字元素坐标 → NSEvent click |
| `wp_inputel TAB "selector" "text"` | 输入文字 | JS 取坐标 → NSEvent click 拿焦点 → 系统剪贴板 → Cmd+V |
| `wp_dismiss TAB "知道了,关闭"` | 关弹窗（批量） | JS 取所有匹配元素坐标 → 逐个 NSEvent click |
| `wp_jsclick TAB "js_returning_x,y"` | 复杂定位+点击 | 自定义 JS 返回坐标 → NSEvent click |
| `wp_scrollel TAB "selector"` | 滚动到元素 | JS scrollIntoView（纯视觉，不交互） |
| `wp_readel TAB "selector"` | 读元素文字 | JS textContent（纯读取，不交互） |
| `wp_key TAB "enter"` | 按键 | NSEvent keyDown（真实键盘事件） |
| `wp_key TAB "cmd+a"` | 组合键 | NSEvent keyDown + modifier |
| `wp_type TAB "text"` | 打字（英文） | NSEvent interpretKeyEvents（中文会乱序，用 inputel） |
| `wp_click TAB x y` | 坐标点击 | NSEvent mouseDown/mouseUp at (x,y) |

### JS 只能做什么

- **读数据**：`textContent`、`innerText`、`querySelector`、`getBoundingClientRect` — 纯读取，平台检测不到
- **定位元素**：返回坐标给 `wp_jsclick` — JS 只算坐标，不做交互
- **触发文件对话框**：`input[type=file].click()` — 隐藏元素无坐标，且平台不检查（触发系统对话框）
- **Session 检查**：`fetch` API 探测 — 后台请求，不是用户交互

### 写新脚本时

```bash
# ✅ 正确
wp_clickel $TAB "text:发布"
wp_inputel $TAB "[contenteditable=true]" "$text"
wp_dismiss $TAB "知道了,关闭,取消"
wp_key $TAB "enter"

# ❌ 错误 — 会被检测
wp_js $TAB '(function(){ document.querySelector("button").click() })()'
wp_js $TAB '(function(){ el.dispatchEvent(new Event("click")) })()'
wp_js $TAB '(function(){ document.execCommand("insertText", false, "text") })()'
```

## 核心规则

- **cookie 已持久化**：固定 UUID dataStore + 锁定 User-Agent，重启不丢
- **日常不要 kill 进程**：用 `reload` / `reload_all` 刷新
- **发布后必须自验证**：截图确认发布成功，不确认 = 没发完
- **禁止删除已发布内容**：只能用户手动删
- **禁止跨域导航**：每个 tab 只能在自己平台的域名内操作，不准 goto 到别的域名。tab 1 是 creator.xiaohongshu.com 就只能在这个域名下导航，goto www.xiaohongshu.com = 丢登录态 = 要重新扫码。违反这条会导致 cookie 失效、平台掉登录。
- 每个脚本的动作列表：`bash scripts/xxx.sh help`
