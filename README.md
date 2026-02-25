# SNH48 MCP Server

**SNH48 GROUP** 相关信息查询的 MCP（Model Context Protocol）服务器，支持通过 AI 助手查询成员、公演票务、竞价等信息。

> 当前阶段：✅ 成员查询模块已完成

---

## 功能模块

| 模块 | 状态 | 说明 |
|---|---|---|
| 成员查询 | ✅ 已完成 | SQL 方式查询全部在籍成员信息 |
| 公演票务 | 🚧 开发中 | — |
| 竞价 | 🚧 开发中 | — |

---

## 快速开始

### 1. 安装

```bash
pip install -e .
```

### 2. 启动 MCP 服务器

```bash
python -m snh48_mcp.server
```

### 3. 调试（带 Inspector UI）

```bash
fastmcp dev src/snh48_mcp/server.py
```

---

## 配置到 MCP 客户端

以 Claude Desktop 为例，在 `claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "snh48": {
      "command": "python",
      "args": ["-m", "snh48_mcp.server"],
      "cwd": "/path/to/snh48-agent-n-mcp"
    }
  }
}
```

---

## 工具说明

### `query_members_sql(sql)`

对 SNH48 成员数据库执行 SQL 查询，**仅支持 SELECT 语句**。

数据库表：`members`，共 ~715 条记录，覆盖 SNH48、GNZ48、BEJ48、CKG48、CGT48 全部在籍成员。

> **自动刷新策略**：每次工具调用时会检查数据新鲜度。服务启动后首次调用、或距上次刷新超过 TTL（默认 1 小时）时，会自动从 API 重新拉取最新数据，无需手动干预。

<details>
<summary>查看完整字段列表（29 个字段）</summary>

| 字段 | 说明 | 示例 |
|---|---|---|
| `sid` | 成员唯一ID（主键） | `"10125"` |
| `sname` | 中文名 | `"刘增艳"` |
| `pinyin` | 拼音名 | `"Liu ZengYan"` |
| `abbr` | 姓名缩写 | `"LZY"` |
| `nickname` | 昵称（顿号分隔） | `"增锅、增增"` |
| `gname` | 团体简称 | `SNH` \| `GNZ` \| `BEJ` \| `CKG` \| `CGT` |
| `tname` | 队伍简称 | `SII` \| `NII` \| `HII` \| `X` |
| `pname` | 期数 | `"SNH48 五期生"` |
| `join_day` | 加入日期 | `"2015-07-25"` |
| `height` | 身高 (cm) | `"157"` |
| `birth_day` | 生日 (MM.DD) | `"08.31"` |
| `star_sign_12` | 十二星座 | `"处女座"` |
| `birth_place` | 出生地 | `"中国 四川 "` |
| `blood_type` | 血型 | `A` \| `B` \| `O` \| `AB` \| `-` |
| `speciality` | 特长 | `"合气道、日翻歌曲"` |
| `hobby` | 爱好 | `"ACG、电吉他"` |
| `experience` | 成员经历（含 `<br>` 换行） | 历届总决选成绩等 |
| `catch_phrase` | 口号 | `"增锅用蒸锅..."` |
| `ranking` | 年度盛典排名（0=未上榜） | `"6"` |
| `pocket_id` | 口袋48 ID（0=无账号） | `"63566"` |
| `weibo_uid` | 微博UID（0=无） | `"5681431767"` |
| `is_group_new` | 新成员 (1=是) | `"0"` |
| `status` | 状态（99=在籍） | `"99"` |

</details>

**示例查询：**

```sql
-- 按姓名搜索
SELECT sname, pinyin, gname, tname, pname FROM members WHERE sname LIKE '%段艺璇%'

-- 统计各队伍人数
SELECT gname, tname, COUNT(*) AS cnt FROM members GROUP BY gname, tname ORDER BY gname

-- 查询四川籍成员
SELECT sname, gname, tname FROM members WHERE birth_place LIKE '%四川%'

-- 年度盛典排名前10
SELECT sname, gname, tname, CAST(ranking AS INTEGER) AS r
FROM members WHERE ranking != '0' ORDER BY r LIMIT 10

-- 身高最高的10位成员
SELECT sname, gname, tname, CAST(height AS INTEGER) AS h
FROM members WHERE height != '' ORDER BY h DESC LIMIT 10
```

---

### `refresh_member_data()`

强制从 SNH48 官方 API 重新拉取最新成员数据，覆盖本地缓存并重建数据库。

---

## 数据更新策略

| 场景 | 行为 |
|---|---|
| 服务启动，有本地缓存 | 快速从缓存加载，首次工具调用时触发自动刷新 |
| 服务启动，无本地缓存 | 直接从 API 拉取 |
| 距上次刷新 < TTL | 跳过刷新，直接使用内存数据 |
| 距上次刷新 ≥ TTL | 自动从 API 重新拉取并更新内存数据库 |
| 手动调用 `refresh_member_data()` | 立即强制刷新，无视 TTL |

默认 TTL 为 **3600 秒（1 小时）**，可通过环境变量覆盖：

```bash
# 设置缓存有效期为 30 分钟
SNH48_CACHE_TTL=1800 python -m snh48_mcp.server
```

---

## 项目结构

```
snh48-agent-n-mcp/
├── src/snh48_mcp/
│   ├── __init__.py
│   ├── member_db.py    # 数据层：API 拉取 → JSON 缓存 → SQLite 内存库
│   └── server.py       # MCP 服务器入口
├── data/               # 本地缓存（.gitignore 已排除）
├── references/         # 参考脚本（.gitignore 已排除）
├── pyproject.toml
└── requirements.txt
```

---

## 数据来源

成员数据来自 SNH48 官方 API
