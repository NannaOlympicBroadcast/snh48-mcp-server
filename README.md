# SNH48 Agent Skill

这个仓库已从 **MCP Server** 改造为可直接给 Agent 使用的 **Skill** 形态。

> 目标：MCP 生态收缩后，仍能让 Agent 稳定执行 SNH48 成员查询与数据刷新。

---

## Skill 能力

- 查询成员数据库（只读 SQL）
- 自动按 TTL 刷新成员数据缓存
- 手动强制刷新成员数据

数据源仍为 SNH48 官方成员 API。

---

## 安装

```bash
pip install -e .
```

---

## 给 Agent 的 Skill 入口

本仓库提供 `SKILL.md`（给 Agent 的操作说明）+ 可执行 CLI。

### CLI 命令

```bash
# 查询（仅 SELECT）
snh48-skill query "SELECT sname, gname, tname FROM members WHERE sname LIKE '%段艺璇%'"

# 强制刷新缓存
snh48-skill refresh
```

### 可选环境变量

- `SNH48_CACHE_TTL`：缓存 TTL（秒），默认 `3600`
- `SNH48_CACHE_FILE`：缓存文件路径（默认 `data/snh48_members.json`）

---

## 项目结构

```text
snh48-mcp-server/
├── SKILL.md                 # Agent Skill 说明（核心）
├── snh48_mcp/
│   ├── member_db.py         # 数据层：API 拉取 → JSON 缓存 → SQLite 内存库
│   └── skill_tools.py       # Skill CLI 入口
├── data/                    # 本地缓存目录（运行后自动生成）
├── pyproject.toml
└── requirements.txt
```

---

## 说明

- `server.py` 保留为历史兼容文件，不再作为推荐入口。
- 推荐所有 Agent 集成都走 `SKILL.md` 中定义的工作流。
