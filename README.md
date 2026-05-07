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

本仓库配置了完整的自动化测试与审查流水线：

```
PR 创建
  ↓
[test.yml] 运行 CI 测试 (Python 3.11/3.12)
  ├─ test (3.11) ✅
  ├─ test (3.12) ✅
  └─ lint (代码检查) ✅
  ↓ (成功)
[并行执行]
  ├─ [copilot-agent-review.yml] Agent 执行 Skills
  │  ├─ query 验证
  │  ├─ refresh 验证
  │  ├─ shows 验证
  │  └─ plan 验证
  │
  └─ [copilot-advanced-agent.yml] 高级 Agent 审查 ⭐ 推荐
     ├─ Copilot 理解项目（读 SKILL.md）
     ├─ 执行所有 Skills
     ├─ 评估代码质量
     ├─ 评估文档完整性
     ├─ 给出整体评分（如 9/10）
     └─ 生成详细报告
  ↓
自动标记标签：ci-passed, ready-to-merge, copilot-advanced-reviewed
  ↓
PR 评论：Copilot Agent 审查报告 + 智能建议
  ↓
⏳ 等待人工批准 (Approve)
  ↓
✅ 自动或手动合并
```

### 三个工作流详解

#### 1️⃣ 测试流水线 (`test.yml`)
- **触发**：PR 创建/更新、push 到 main
- **职责**：
  - 4 个集成测试（query、refresh、shows、plan）
  - Python 3.11、3.12 双版本
  - 代码格式检查（Ruff）
  - Python 语法验证
- **输出**：PR 评论测试结果

#### 2️⃣ Copilot Agent 审查 (`copilot-agent-review.yml`) ⭐ **新增**
- **触发**：PR 创建/更新（非草稿）
- **职责**：
  - 🤖 自动运行所有 Skill 命令验证
  - 📝 检查文档是否完整
  - 🔍 代码质量检查
  - 📊 生成详细审查报告
  - 🏷️ 自动标记 `copilot-reviewed` 和 `ready-to-merge`
- **输出**：
  - PR 初始评论（审查进行中）
  - PR 最终评论（审查结果 + 合并建议）
  - 自动标签标记

#### 3️⃣ 辅助审查流程 (`copilot-review.yml`)
- **触发**：test.yml 成功
- **职责**：检查 PR 合并就绪状态

#### 4️⃣ Copilot CLI Agent 审查 (`copilot-cli-agent.yml`) ⭐ 新增
- **触发**：PR 创建/更新
- **职责**：
  - 🤖 执行所有 Skills 命令验证
  - 📊 生成审查报告
  - 🏷️ 自动标记 `ready-to-merge`

#### 5️⃣ Copilot Advanced Agent 审查 (`copilot-advanced-agent.yml`) ⭐⭐ 推荐
- **触发**：PR 创建/更新
- **职责**：
  - 🧠 Copilot 深度理解项目（读 SKILL.md）
  - 🤖 自动验证所有 Skills
  - 📈 评估代码和文档质量
  - 🎯 给出智能合并建议和评分（如 9/10）
  - 📝 详细的审查报告
- **优势**：最智能的自动审查，推荐启用此工作流

### 分支保护配置建议

在 GitHub 仓库 Settings → Branches → Branch protection rules 中，对 `main` 分支配置：

#### ✅ 必需项
1. **Require status checks to pass before merging**
   - ☑️ `SNH48 Skill CI 测试`
   - ☑️ `Copilot Agent 自动审查与验证`（可选）

2. **Require pull request reviews before merging**
   - Approvals: 1
   - ☑️ Dismiss stale pull request approvals when new commits are pushed

#### ⭐ 推荐项
3. **Allow auto-merge**
   - 选择合并方式：
     - `Squash and merge` - 推荐（保持提交清晰）
     - `Rebase and merge`
     - `Create a merge commit`

配置后：
- ✅ 所有 PR 必须通过 CI 检查
- ✅ 必须有人工批准审查
- ✅ 符合条件自动合并（启用自动合并时）

### 典型 PR 流程

1. **创建 PR**
   ```
   git push origin feature/my-feature
   # 在 GitHub 上打开 PR
   ```

2. **自动测试与审查**（无需操作）
   - `test.yml` 运行 (3-5 分钟)
   - `copilot-agent-review.yml` 执行 (1-2 分钟)
   - PR 自动标记为 `ready-to-merge`

3. **人工审查**
   - 审查代码
   - 点击 `Approve` 按钮

4. **自动合并**（如启用）
   - GitHub 自动执行合并
   - 或点击 `Squash and merge`

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
