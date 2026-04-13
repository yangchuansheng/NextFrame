# AutoMedia 启动与管理

启动、部署、验证、排障。用户说"启动 automedia"、"检查登录"、"重启"时触发。

TRIGGER: "启动 automedia"、"automedia 启动"、"检查登录态"、"重启 automedia"、"部署 automedia"、"automedia 怎么用"。
DO NOT TRIGGER when: 具体平台发布（用 publish-* skill）。

## 首次使用（新机器）

```bash
cd automedia
cargo build --release
cp target/release/automedia AutoMedia.app/Contents/MacOS/automedia
open AutoMedia.app
```

窗口出来后，用户需要逐个 tab 扫码登录 5 个平台：

| Tab | 平台 | 默认 URL |
|-----|------|---------|
| 0 | 抖音 | https://creator.douyin.com |
| 1 | 小红书 | https://creator.xiaohongshu.com |
| 2 | B站 | https://member.bilibili.com |
| 3 | 视频号 | https://channels.weixin.qq.com |
| 4 | 公众号 | https://mp.weixin.qq.com |

登录一次即可。cookie 持久化（固定 UUID dataStore + 锁定 User-Agent），重启不丢。

## 日常启动

```bash
open AutoMedia.app
```

不需要重新登录。cookie 自动恢复。

## 检查登录态

逐个平台截图确认：

```bash
bash scripts/douyin.sh screenshot && echo "抖音" && cat /tmp/wp-result-0.txt
bash scripts/xhs.sh screenshot && echo "小红书" && cat /tmp/wp-result-1.txt
bash scripts/bili.sh screenshot && echo "B站" && cat /tmp/wp-result-2.txt
bash scripts/channels.sh screenshot && echo "视频号" && cat /tmp/wp-result-3.txt
bash scripts/mp.sh screenshot && echo "公众号" && cat /tmp/wp-result-4.txt
```

截图在 `/tmp/wp-screenshot-N.png`，用 Read 工具查看。

更精确的检查（JS 检测是否在登录页）：

```bash
source scripts/lib.sh
wp_login_check 0    # 抖音
wp_login_check 1    # 小红书
wp_login_check 2    # B站
wp_login_check 3    # 视频号
wp_login_check 4    # 公众号
```

返回 `LOGGED_IN` = 正常，`LOGIN_PAGE` = 掉了需要用户扫码。

## 代码更新后部署

```bash
cd automedia
cargo build --release
cp target/release/automedia AutoMedia.app/Contents/MacOS/automedia
kill $(pgrep -f automedia); sleep 2; open AutoMedia.app
```

URL 自动恢复到上次页面。重启后立即检查登录态。

## 刷新（不重启）

日常刷新用命令，不要 kill 进程：

```bash
source scripts/lib.sh
wp_reload 0          # 刷新单个 tab
wp_reload_all        # 刷新所有 tab
```

## 禁止操作

- **不要随便 kill 进程** — 用 reload 代替
- **不要删 `/tmp/wp-tabs-state.json`** — tab URL 恢复文件
- **不要改 `main.rs` 里的 UUID** — 改了等于清空所有登录
- **不要删除任何平台上的已发布内容** — 只能用户手动删

## 命令通道

写入 `/tmp/wp-cmd-N.js`，结果出现在 `/tmp/wp-result-N.txt`。

| 命令 | 说明 |
|------|------|
| `screenshot` | 截图到 `/tmp/wp-screenshot-N.png` |
| `goto {url}` | 导航 |
| `type {text}` | 原生键盘输入 |
| `key {combo}` | 按键（space/enter/cmd+a 等） |
| `click {x} {y}` | 鼠标点击 CSS 坐标 |
| `clickel {selector}` | 点击元素（CSS 选择器或 `text:文字`） |
| `paste {text}` | 粘贴板粘贴 |
| `reload` | 刷新当前 tab |
| `reload_all` | 刷新所有 tab |
| 其他 | 当作 JS 执行 |

上传文件：写路径到 `/tmp/wp-upload-path-N.txt`，然后 JS 点击 `input[type=file]`。

## 排障

**进程挂了（命令超时）：**
```bash
ps aux | grep automedia | grep -v grep   # 检查进程
# 如果没输出 → 进程死了，重新 open AutoMedia.app
```

**登录掉了：**
- AI 无法代替扫码，告诉用户去 AutoMedia 窗口对应 tab 扫码
- 扫码后用 `screenshot` 确认恢复

**某个 tab 页面异常：**
```bash
source scripts/lib.sh
wp_reload N          # 刷新该 tab
wp_goto N "默认URL"   # 或导航回默认页
```
