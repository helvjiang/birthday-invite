# 十月十一 · 生辰电子邀函

一个**零服务器成本**的生日邀请函：受邀者输入名字 → 看到专属邀函 → 接受后进入「爱心选座」（100 座，可传图 + 无上限祝福，照片可设仅自己与寿星可见）→ 在「赠礼」页投递赛博礼物（全 emoji）。所有人可见彼此落席与贺礼。

技术栈：纯静态前端 + Supabase（免费层）。演示模式无需任何账号即可预览。

---

## 一、现在就能看效果（演示模式，无需账号）

项目默认 `config.js` 里 `DEMO: true`，数据存在浏览器本地。

- 最简单：双击 `index.html`（部分浏览器对 `file://` 的 localStorage 有限制，建议用下面方式）
- 推荐：在本目录起本地服务，再打开 `http://localhost:8000`
  ```bash
  python -m http.server 8000
  ```
- 试试：输入名单里的名字（如 `李文静`）看专属邀函；空文案的人会显示默认兜底；名单外名字提示「您没有被邀请！」（名单来自 `邀请函-名单.xlsx`，由 `build_invitations.py` 生成 `invitations.js`）
- 后台：打开 `admin.html`，密码见 `config.js` 的 `ADMIN_PASSWORD`（默认 `19991011`）

---

## 二、上线（0 元 · 不花钱 · 纯网页操作）

> 部署目标：**GitHub Pages**——免费、不用买服务器、不用输密码（浏览器已登录 GitHub 直接点）。国内通常能正常打开，比被墙的 `*.workers.dev` 稳得多。
> 您之前在 Cloudflare 部署的 `delicate-band-fdf0.workers.dev` 已被墙（连接超时），可忽略或删掉，不影响本次。

### 1. Supabase（已建好，确认即可）
- 确认 `invitations` 表有 **74 行**（之前 `seed_invitations.sql` 已灌）
- **保活**：免费项目 1 周不活跃会暂停，上线前在 Supabase 项目里点开任意页面「激活」
- **CORS（上线后若报跨域才处理）**：去 **Settings → API → CORS**，加一条 `https://<您的GitHub用户名>.github.io`（或先填 `*` 测试）
- **补授权（必须）**：纯 SQL 建的表不会自动给匿名访客授权，请到 SQL Editor 跑一遍本目录的 `grants_fix.sql`，否则线上读不到邀函、写不进选座/赠礼（本地演示模式用不到，故一直未发现）

### 2. 配置（已填好，确认即可）
`config.js` 当前 `DEMO: false` + 真实 Supabase 地址和 anon key，无需再改。

### 3. 部署到 GitHub Pages（纯网页，约 10 分钟）
1. 打开 https://github.com → 右上角 **+ → New repository**
   - Repository name 填一个，如 `birthday-invite`（链接即 `https://<用户名>.github.io/birthday-invite/`）
   - 选 **Public** → **Create repository**
2. 进仓库后，点 **Add file → Upload files**
   - 在文件管理器选中本项目**需要的文件/文件夹**，**拖拽到上传区**（GitHub 网页支持拖拽整个文件夹并保留层级）：
     - 必传：`index.html`、`app.js`、`store.js`、`config.js`、`style.css`、`invitations.js`、`admin.html`
     - 必传文件夹：`assets/`（含 `bgm.wav`）
     - 可选：`邀请函-名单.xlsx`、`build_invitations.py`、`gen_seed.py`、`README.md`
   - ⚠️ **不要**上传 `.workbuddy/` 文件夹（本地工作记录，与网站无关）
   - 底部写一句 commit 说明（如「生日邀函上线」）→ **Commit changes**
3. 仓库页点 **Settings → Pages**（左侧）→ **Source** 选 **Deploy from a branch** → Branch 选 **main**（或 master）→ folder 选 **/ (root)** → **Save**
4. 等 **1–2 分钟**，顶部出现链接 `https://<用户名>.github.io/birthday-invite/`，点开即线上邀函

### 4. 验证 + 发微信
- 打开链接，输入名单里的名字（如 `李文静`）→ 显示专属邀函（落款「陈山石 谨邀」）；名单外名字 → 「您没有被邀请！」
- 接受 → 选座（方块爱心） → 赠礼，全跑一遍
- 把链接发朋友圈/微信群
- ⚠️ 微信可能拦截未备案域名（弹「已停止访问」）；若朋友反馈打不开，复制链接到手机浏览器即可。彻底解决需买已备案域名绑定（几十元/年，但备案周期赶不上 10-11，先这样发）

---

## 三、陛下后台
打开 `admin.html`，输入 `config.js` 里的 `ADMIN_PASSWORD`，可见：
- 概览：受邀 / 接受 / 婉拒 / 落席 / 赠礼数
- 席位明细：谁坐第几席、题字、**私密照片也在此可见**、可见性标注
- 赠礼明细：谁送了什么、各多少

---

## 四、可扩展空间（您要的「随意编辑」）
- **邀请函内容**：存在 Supabase `invitations` 表，直接改文字即可，不用动代码
- **每人单独样式**：在 `invitations.theme` 写一段 CSS 变量，如 `--bg:#1a1410;--red:#e8b04b;`，该人邀函自动换肤
- **礼品清单**：改 `config.js` 的 `GIFTS` 数组，加一行 `{key, emoji, name}` 即可
- **背景音乐**：改 `assets/gen_bgm.py` 的旋律后重跑 `python assets/gen_bgm.py`

---

## 五、注意事项
- **私密照片**：前端按可见性对访客隐藏；严格保密可把 Storage 桶改为 private 并用签名 URL（进阶，需改 `store.js`）
- **防滥用**：当前为「轻防护」（朋友间够用）。要更严可加邀请 token、赠礼频率限制，或 Supabase Edge Function 做服务端校验
- **免费额度**：Supabase 免费层 1GB 存储 / 500MB 数据库 / 100 座位图片绰绰有余；免费项目 1 周不活跃会暂停，用前点一下即可
- **删不当内容**：陛下后台目前为「查看」；删除请在 Supabase 网页后台操作，或后续加 Edge Function
