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
│   └── copilot-review.yml             # Copilot 自动审查配置
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

本仓库配置了 GitHub Actions 自动化测试与审查：

### 测试流水线 (`.github/workflows/test.yml`)
- **触发条件**：PR 到 main / push 到 main
- **测试内容**：
  - 运行 4 个集成测试（query、refresh、shows、plan）
  - Python 3.11 和 3.12 双版本支持
  - 代码格式检查（Ruff）
  - Python 语法验证
- **成功时**：自动在 PR 评论测试结果，标记为可审查
- **失败时**：自动评论失败信息，提示查看日志

### Copilot 审查 (`.github/workflows/copilot-review.yml`)
- **自动请求** Copilot 代码审查
- **CI 通过后**，自动检查合并条件
- **支持自动合并**（需配置分支保护规则）

### 分支保护配置建议

在 GitHub 仓库设置中，对 `main` 分支启用：

1. **Require status checks to pass before merging**
   - 选择 `SNH48 Skill CI 测试` 流程
   - 确保所有构建版本通过

2. **Require pull request reviews before merging**
   - 至少需要 1 个批准审查

3. **Require conversation resolution before merging**（可选）

4. **Auto-merge** 配置（如果启用）
   - 选择合并方式（建议 Squash 或 Rebase）

配置后，符合条件的 PR 可自动合并，无需手动干预。

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
