# SNH48 Agent Skill

这个仓库已从 **MCP Server** 改造为可直接给 Agent 使用的 **Skill** 形态。

> 目标：MCP 生态收缩后，仍能让 Agent 稳定执行 SNH48 成员查询与数据刷新。

---

## Skill 能力

- **成员管理**：查询成员数据库（只读 SQL）、自动按 TTL 刷新缓存、手动强制刷新
- **公演信息**：获取一周内的演出场次、票务状态（有售/售罄）、购票链接
- **日程查看**：获取按天聚合的公演日程摘要（含演出时间、参演成员、场地）

支持 SNH48、BEJ48、GNZ48、CKG48、CGT48 五个团体。

数据源为 SNH48 官方成员 API 及票务 API。

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
├── SKILL.md                           # Agent Skill 说明（核心）
├── test_skills.py                     # 集成测试脚本
├── .github/workflows/
│   ├── test.yml                       # CI 测试流水线（Python 3.11/3.12）
│   └── copilot-skill-review.yml       # Copilot CLI 审查（真实 @github/copilot）
├── snh48_mcp/
│   ├── member_db.py                   # 成员数据模块
│   ├── show_db.py                     # 公演信息模块
│   └── skill_tools.py                 # CLI 入口
├── data/                              # 本地缓存（自动生成）
├── pyproject.toml
└── requirements.txt
```

---

## CI/CD 流程

```
PR 创建
  ↓
[test.yml] CI 测试 (Python 3.11/3.12 + lint)
  ↓ (通过)
[copilot-skill-review.yml] Copilot CLI 智能审查
  ├─ 安装 @github/copilot CLI
  ├─ Copilot 读取 SKILL.md，了解项目支持的技能
  ├─ Copilot 依次运行所有 snh48-skill 命令
  ├─ Copilot 评估代码质量和文档完整性
  └─ Copilot 写入审查报告并评论到 PR
  ↓
⏳ 人工 Approve
  ↓
✅ 合并
```

### 工作流说明

#### `test.yml` — CI 测试
- Python 3.11 / 3.12 双版本
- 4 个集成测试（query、refresh、shows、plan）
- 代码格式检查（Ruff）

#### `copilot-skill-review.yml` — Copilot 审查
基于 [GitHub 官方文档](https://docs.github.com/zh/copilot/how-tos/copilot-cli/automate-copilot-cli/automate-with-actions)，使用真实的 `@github/copilot` CLI。

Copilot 会：
1. 读取 `SKILL.md` 理解项目支持的所有技能
2. 运行每个 `snh48-skill` 命令（query / refresh / shows / plan）
3. 检查返回 JSON 格式、字段完整性、代码与文档质量
4. 将审查报告写入 `copilot_review.md` 并评论到 PR

**启用前提**：在仓库 Settings → Secrets → Actions 中添加 `PERSONAL_ACCESS_TOKEN`（需要 **Copilot 请求** 权限的 PAT）。

---

## 本地测试

```bash
# 运行所有集成测试
python test_skills.py

# 只测试特定命令
python -m snh48_mcp.skill_tools shows --gid 1 --days 7
python -m snh48_mcp.skill_tools plan --gid 1
```

---

## 说明

- `server.py` 保留为历史兼容文件，不再作为推荐入口。
- 推荐所有 Agent 集成都走 `SKILL.md` 中定义的工作流。
- 公演信息 API 调用**不缓存**，实时获取最新数据。
