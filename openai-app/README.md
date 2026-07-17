# SNH48 MCP App（OpenAI Apps SDK / MCP Apps + Vercel）

将 `snh48-mcp-server` 的成员与公演查询能力，改造为符合 [MCP Apps](https://github.com/modelcontextprotocol/ext-apps)
（OpenAI Apps SDK 底层依赖的同一套开放标准）规范的**带可视化界面**的远程 MCP 服务器，部署在 Vercel Edge Functions 上。

## 能力

| 工具 | 说明 | 界面 |
| --- | --- | --- |
| `search_members` | 按姓名/昵称/团体/队伍/期数/籍贯查询 SNH48、GNZ48、BEJ48、CKG48、CGT48 在籍成员 | 成员照片卡片网格；仅命中一人时自动展开为详情卡（大图+简介+经历时间线） |
| `get_upcoming_shows` | 查询未来 N 天内的剧场公演场次及票务状态 | 按日期分组的时间线卡片，含购票按钮 |

成员照片通过服务端 `/api/img` 接口代理自官方 `www.snh48.com/images/member/zp_{sid}.jpg`，
避免浏览器 / 宿主 iframe 直接跨域请求 SNH48 官网导致 CORS 失败；找不到照片时会返回按团队色生成的
SVG 占位头像，保证界面始终有视觉呈现。

## 目录结构

```
openai-app/
├── api/
│   ├── mcp.ts      # MCP 端点（Vercel Edge Function，Streamable HTTP，无状态模式）
│   └── img.ts       # 成员照片代理 + 占位图生成
├── src/
│   ├── mcp-server.ts # 注册 MCP 工具与 UI widget 资源
│   ├── lib/
│   │   ├── members.ts  # 成员数据拉取、缓存、筛选
│   │   ├── shows.ts    # 公演/票务数据拉取
│   │   └── photo.ts    # 照片代理 URL、占位图 SVG 生成
│   └── widgets/
│       ├── bootstrap.ts # widget 通用宿主通信脚本 + 基础样式
│       ├── members.ts   # 成员卡片 / 详情 widget（原生 HTML/JS，无需构建）
│       └── shows.ts     # 公演日程 widget
├── public/index.html  # 根路径说明页
└── vercel.json        # /mcp → /api/mcp 重写
```

## 本地开发

```bash
npm install
npm run build   # tsc 类型检查 + 编译（Vercel 部署时会用自己的构建流程，这里主要用于类型检查）
```

由于两个入口都使用 Web Standard `Request`/`Response`（`export const config = { runtime: "edge" }`），
可以直接在 Node 18+ 下 `import` 后用原生 `fetch`/`Request` 构造请求做单元测试，无需真正启动 Vercel dev。

## 部署到 Vercel

```bash
npm i -g vercel
vercel link
vercel env add PUBLIC_BASE_URL   # 可选：填入最终生产域名，如 https://snh48-mcp.vercel.app
vercel --prod
```

`package.json` 已将 `main` 指向 `api/mcp.ts`，用于满足 Vercel Node 构建阶段对入口文件的检测要求，避免
`No entrypoint found in "/vercel/path0"` 错误。

- `PUBLIC_BASE_URL`：可选。不设置时，服务会根据请求的 `Host`/`X-Forwarded-Host` 自动推断当前部署域名，
  用于拼接成员照片代理链接与 widget 的 `ui.domain`/CSP 配置。生产环境建议显式设置为最终自定义域名，避免
  Vercel 预览域名（`*-git-*.vercel.app`）变化导致图片链接失效。
- `SNH48_CACHE_TTL`：可选，成员数据内存缓存 TTL（秒），默认 `3600`。

部署完成后，MCP 端点为：

```
https://<your-domain>/api/mcp
https://<your-domain>/mcp        # 等价重写
```

## 接入 ChatGPT / Claude

在 ChatGPT 开发者模式 或 Claude 的「连接器」设置中，添加自定义远程 MCP 服务器，
填入上面的 `/api/mcp` 地址即可。宿主会自动发现 `search_members`、`get_upcoming_shows`
两个工具及其关联的 HTML widget，调用工具后即在对话内渲染带成员照片的可视化卡片。

## 与仓库内 Python Skill 版本的关系

仓库根目录的 `server.py` / `snh48_mcp/` 是面向 Agent Skill / 传统 stdio MCP 的 Python 实现（详见根 `README.md`）。
本目录 `openai-app/` 是独立的 Node/TypeScript 实现，专门用于 OpenAI Apps SDK / MCP Apps 场景下的
远程 HTTP 部署与可视化 widget，两者数据源相同但相互独立，互不依赖。
