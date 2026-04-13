---
name: publish-mp
description: >
  发布文章到微信公众号。通过 automedia 操作公众号后台，自动创建图文。
  自动处理：标题、作者、富文本正文（标题/列表/引用/分割线）、封面图、发表。
  关键：公众号用 token URL 认证，导航必须保留 token；发表需微信扫码验证；群发有每日次数限制。
  TRIGGER: "发公众号"、"发到公众号"、"公众号发布"、"publish mp"、"发文章"、"写公众号"。
  DO NOT TRIGGER when: 其他平台发布、视频号发布（用 publish-channels）。
argument-hint: "<标题> [作者] [正文内容]"
---

# /publish-mp — 发布文章到微信公众号

通道：公众号 = tab 4 → `/tmp/wp-cmd-4.js` `/tmp/wp-result-4.txt`

## 排版必读（铁律）

**写正文 HTML 前必读以下两个引用，不读不写：**

1. **`automedia/scripts/mp-style-guide.md`** — 排版技术规范（CSS白名单/深色模式规则/色板/原则）
2. **`automedia/scripts/mp-atoms/`** — 原子库（7 个 HTML 文件，可直接复制的排版组件）

**排版核心要点（速查）：**
- **暖色色板**：卡片底 `#f5f0e8`，标题 `#2c1810`，正文 `#5c4a35`，强调 `#c49a3c`
- **彩色不被微信深色模式转换**，灰度色会被转 → 所有颜色带色相
- 暗色元素加 `data-no-dark="true"`
- 用 `section` 不用 `div`，用 `padding` 不用 `margin`
- 列表用 `section + display:flex`，不用 `ul/li`
- **禁止** `font-family`（会导致整段样式丢弃）、`position`、`%` 单位 margin
- **正文不带标题区** — 标题已在标题栏，正文直接从内容开始

**原子库索引：**
```
atoms-typography.html   段落/强调/标题/章节编号
atoms-quotes.html       书摘/竖线引用/卡片引用/金句/提示框
atoms-layout.html       双栏/三列/图标行/编号列表/时间轴
atoms-data.html         大数字/进度条/对比卡片/标签
atoms-dividers.html     实线/虚线/渐变/菱形/品牌条
atoms-dark.html         暗色数据面板/引用/外框
atoms-interactive.html  SVG 点击展开/问答/色块
```

## 脚本调用（推荐）

所有操作已封装到 `scripts/mp.sh`，一次一个动作：

```bash
bash scripts/mp.sh open                           # 进入编辑器（保留 token）
bash scripts/mp.sh dismiss                        # 关弹窗
bash scripts/mp.sh title "标题"                   # 填标题（JS valueSetter）
bash scripts/mp.sh author "作者名"                # 填作者（JS valueSetter）
bash scripts/mp.sh body "<section>正文</section>"  # HTML 正文（注入 ProseMirror）
bash scripts/mp.sh body_text "纯文本正文"          # 纯文本（自动加 <p>）
bash scripts/mp.sh cover "/tmp/cover.jpg"         # 封面图（图片库上传+选择+裁剪）
bash scripts/mp.sh publish                        # 发表（自动关群发通知+弹扫码）
bash scripts/mp.sh check                          # 检查结果
bash scripts/mp.sh login_check                    # 检查登录
bash scripts/mp.sh screenshot                     # 截图
```

**每个动作之间 AI 自己 sleep + screenshot 验证。** 不要连续调用不等结果。

## 核心规则

1. **Token 认证** — 公众号 URL 带 `token=xxx` 参数，`goto` 跳转会丢 token。导航必须用 JS `window.location.href` 拼接 token
2. **每次发表需微信扫码** — 最后一步弹二维码，用户手机扫码确认，无法跳过
3. **群发次数有限** — 每天 1 次群发（推送给所有粉丝）。**测试时必须关闭群发通知**
4. **正文编辑器是 ProseMirror** — 不是第一个 contenteditable（那是原创声明区），是 `.ProseMirror`
5. **封面图必须有** — 没有封面图无法发表

## 导航模板（保留 token）

```javascript
var token = window.location.href.match(/token=(\d+)/)[1];
window.location.href = '/cgi-bin/目标路径&token=' + token;
```

**绝对不要用 `goto` 命令导航公众号页面，会丢失登录态。**

## 发布流程

### 1. 进入编辑器

```javascript
var token = window.location.href.match(/token=(\d+)/)[1];
window.location.href = '/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&type=10&lang=zh_CN&token=' + token;
```

### 2. 关弹窗（小店推广等）

```javascript
document.querySelectorAll('button').forEach(function(b){
    if(b.textContent.trim()==='稍后再说'||b.textContent.trim()==='取消') b.click();
});
```

### 3. 填标题（textarea，≤64字）

```javascript
var ta = document.querySelector('textarea.js_title');
var s = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
s.call(ta, '标题内容');
ta.dispatchEvent(new Event('input', {bubbles: true}));
```

### 4. 填作者

```javascript
var inputs = document.querySelectorAll('input, textarea');
for(var i=0; i<inputs.length; i++){
    if((inputs[i].placeholder||'').indexOf('作者') >= 0){
        // textarea 用 HTMLTextAreaElement, input 用 HTMLInputElement
        var proto = inputs[i].tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement;
        Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(inputs[i], '作者名');
        inputs[i].dispatchEvent(new Event('input', {bubbles: true}));
        break;
    }
}
```

### 5. 填正文（ProseMirror，富文本排版）

**注意：正文编辑器是 `.ProseMirror`，不是第一个 `[contenteditable]`（那个是原创声明区）。**

```javascript
var pm = document.querySelector('.ProseMirror');
pm.focus();
pm.innerHTML = '<h2 style="text-align:center;">主标题</h2>' +
    '<p style="text-align:center;color:#888;font-size:14px;">副标题/导语</p>' +
    '<p><br></p>' +
    '<hr>' +
    '<p><br></p>' +
    '<h3>小标题</h3>' +
    '<p>正文段落，支持 <strong>粗体</strong> 和 <em>斜体</em>。</p>' +
    '<p><br></p>' +
    '<ul><li>列表项一</li><li>列表项二</li></ul>' +
    '<p><br></p>' +
    '<blockquote><p>引用文字</p></blockquote>' +
    '<p><br></p>' +
    '<p style="text-align:center;color:#888;">—— 关注公众号，不错过后续更新 ——</p>';
pm.dispatchEvent(new Event('input', {bubbles: true}));
```

**排版元素对照：**

| 元素 | HTML | 效果 |
|------|------|------|
| 大标题 | `<h2>` | 居中粗体 |
| 小标题 | `<h3>` | 左对齐粗体 |
| 分割线 | `<hr>` | 水平线 |
| 列表 | `<ul><li>` | 无序列表 |
| 引用 | `<blockquote><p>` | 灰色左边框 |
| 粗体 | `<strong>` | 加粗 |
| 文末引导 | `<p style="text-align:center;color:#888;">` | 居中灰色 |

### 6. 设封面图（2026-04 实测流程）

封面设置在页面底部设置区域，通过图片库弹窗操作。

```bash
# 推荐：直接用脚本
bash scripts/mp.sh cover "/tmp/cover.jpg"
```

**手动步骤（脚本失败时排查用）：**

```bash
# 6a. 滚到封面设置区域
wp_js 4 '(function(){var el=document.querySelector(".setting-group__cover_area");if(el){el.scrollIntoView({behavior:"smooth",block:"center"});return "ok"}return "not found"})()'

# 6b. 点封面添加按钮（弹出菜单）
wp_clickel 4 ".select-cover__btn"
sleep 1

# 6c. 点"从图片库选择"（菜单选项之一）
wp_clickel 4 "text:从图片库选择"
sleep 2

# 6d. 上传图片到图片库
echo "/tmp/cover.jpg" > /tmp/wp-upload-path-4.txt
wp_clickel 4 "text:上传文件"
sleep 4

# 6e. 选中图片（上传后自动选中，有绿色边框）
wp_clickel 4 ".weui-desktop-img-picker__item"
sleep 1

# 6f. 下一步
wp_clickel 4 "text:下一步"
sleep 2

# 6g. 确认裁剪（预览 2.35:1 + 1:1 两种比例）
wp_clickel 4 "text:确认"
```

**菜单选项（4 个）：**
| 选项 | 选择器 | 说明 |
|------|--------|------|
| 从正文选择 | `.js_selectCoverFromContent` | 从文章内图片选 |
| 从图片库选择 | `.js_imagedialog` | 打开素材库弹窗（推荐） |
| 微信扫码上传 | `.js_imageScan` | 手机扫码上传 |
| AI 配图 | `.js_aiImage` | 微信 AI 生成 |

### 7. 发表（2026-04 实测流程）

```bash
# 推荐：直接用脚本（自动关群发通知 + 处理弹窗）
bash scripts/mp.sh publish
# → 等 QR scan → 用户扫码 → bash scripts/mp.sh check
```

**手动步骤（脚本失败时排查用）：**

```bash
# 7a. 点底栏"发表"按钮
wp_clickel 4 "button.mass_send"
sleep 3

# 7b. 弹出设置弹窗 — 群发通知开关（默认开）
# ⚠️ 测试文章必须关掉群发通知，否则浪费每日配额（1次/天）
# 找 switch 开关坐标并点击关闭
wp_js 4 '(function(){var sw=document.querySelectorAll("[class*=weui-desktop-switch]");...})()'
wp_click 4 x y

# 7c. 点弹窗内的"发表"按钮（不是底栏的）
# 要用 JS 在 dialog 容器内找 button
wp_js 4 '(function(){var ds=document.querySelectorAll("[class*=dialog]");...})()'
wp_click 4 x y

# 7d. 确认弹窗 → "继续发表"
wp_clickel 4 "text:继续发表"

# 7e. 微信验证二维码 → 用户手机扫码
# AI 无法代替，等用户扫完后 check
```

**弹窗流程（按顺序）：**

```
底栏发表 → 设置弹窗（群发通知/定时发表） → 弹窗内发表 → "继续发表"确认 → 微信扫码
```

## 输入方式总结

| 内容 | 方法 | 选择器 |
|------|------|--------|
| 标题 | TextArea valueSetter | `textarea.js_title` |
| 作者 | Input valueSetter | `input[placeholder*=作者]` |
| 正文 | innerHTML 赋值 | `.ProseMirror`（⚠️不是第一个 contenteditable） |
| 封面 | 素材库上传 → 选择 → 裁剪 | `.js_imagedialog` → `.weui-desktop-img-picker__item` |
| 发表 | button click | `button.mass_send` |

## 文章规格

| 属性 | 要求 |
|------|------|
| 标题 | ≤64 字 |
| 正文 | 支持富文本（h2/h3/ul/blockquote/hr/strong） |
| 封面 | 必须有，2.35:1（列表）+ 1:1（卡片）两种裁剪 |
| 群发 | 每天 1 次（订阅号），用完需等第二天 |
| 发表验证 | 每次需微信扫码 |

## 与其他平台的关键区别

| 项目 | B站 | 视频号 | 公众号 |
|------|-----|--------|--------|
| 内容类型 | 视频 | 短视频 | **图文文章** |
| 编辑器 | 普通 HTML | Shadow DOM | **ProseMirror** |
| 认证方式 | Cookie | Cookie | **URL token + 扫码** |
| 每日限制 | ≤5 条 | ≤3 条 | **群发 1 次/天** |
| 封面 | 自动提取 | 自动提取 | **必须手动设** |
| 发表确认 | 无 | 无 | **微信扫码** |

## 注意事项

1. **绝不用 `goto` 导航** — 会丢 token 导致"请重新登录"
2. **群发通知默认开** — 测试时先关掉，正式发才开
3. **原创声明需认证** — 账号未完成实名认证则不可用
4. **合集功能** — 需在"内容管理"里单独创建合集
5. **登录会过期** — 公众号登录态较短，长时间不操作需重新扫码登录
6. **封面裁剪** — 系统自动裁两种比例（2.35:1 和 1:1），确认时注意画面主体不被裁掉

## 发布后自验证（强制）

验证方式：扫码后 check 返回 SUCCESS → JS 导航到已发表列表（保留 token！）→ 截图看第一条

**发完必须自己确认。不确认 = 没发完。**

1. 发布后立即 `check` — 不等用户问
2. check 不是 SUCCESS → 截图排查，不要报"已发布"
3. 去管理页二次确认 — check 只是初判，管理页截图才是铁证
4. 对比标题和时间 — 确认是刚发的不是旧的
5. 有合集的要确认合集内容数

## 严禁删除（铁律）

**AI 严禁删除任何平台上的已发布内容。不写 delete 动作，不点删除按钮，不提及删除操作。删除只能由用户本人手动操作。**

## 排版（必读）

**写正文 HTML 前必读以下两个引用：**

1. **`automedia/scripts/mp-style-guide.md`** — 排版技术规范（CSS白名单/深色模式规则/色板/原则）
2. **`automedia/scripts/mp-atoms/`** — 原子库（HTML 文件，可直接复制的排版组件）

**排版模式：AI 直接手写 inline-style HTML。** 不用模板脚本，每篇根据内容定制排版。

**关键原则：**
- 用暖色色板（#f5f0e8/#2c1810/#5c4a35/#c49a3c），深浅模式通吃
- 彩色不被微信深色模式转换，灰度色会被转 → 所有颜色带色相
- 暗色元素加 `data-no-dark="true"`
- 外框加 `border-radius:16px; border:1px solid;`
- 列表用 `section + display:flex`，不用 `ul/li`
- 不用 `position` / `font-family` / `%` 单位 margin
- `padding` 比 `margin` 更可靠

## API 发布（认证后可用）

凭证存在 `automedia/.env`（已 gitignore），不要提交到代码里。

```bash
source automedia/.env
# 获取 access_token（2小时有效）
TOKEN=$(curl -s "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${MP_APPID}&secret=${MP_APPSECRET}" | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# 上传封面图（返回 thumb_media_id）
curl -s "https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${TOKEN}&type=thumb" -F media=@/tmp/cover.jpg

# 创建草稿（任何账号都能用）
curl -s "https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${TOKEN}" -H "Content-Type: application/json" -d '{"articles":[{...}]}'

# 发表（不群发，认证后才能用）
curl -s "https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token=${TOKEN}" -H "Content-Type: application/json" -d '{"media_id":"DRAFT_ID"}'
```

**API 权限与账号认证状态：**

| 接口 | 未认证 | 已认证 |
|------|--------|--------|
| 获取 access_token | ✅ | ✅ |
| 上传素材 | ✅ | ✅ |
| 创建草稿 | ✅ | ✅ |
| 发表（freepublish） | ❌ 48001 | ✅ |
| 群发（mass send） | ❌ | ✅ |

**IP 白名单：** 调 API 前必须把出口 IP 加到公众号后台 → 设置与开发 → 开发接口管理 → IP白名单。

## 认证路线（解锁 API + 视频号绑定）

```
手机微信 → 视频号主页 → ... → 认证 → 兴趣认证（需 ≥1000 粉 + 近30天有原创）
    ↓ 通过后
公众号后台 → 账号设置 → 个人认证 → "视频号快速认证" → 扫码
    ↓ 通过后
✅ API freepublish 权限开放
✅ 视频号绑定通了（编辑器一键插入视频号内容）
✅ 公众号显示认证标识
```
