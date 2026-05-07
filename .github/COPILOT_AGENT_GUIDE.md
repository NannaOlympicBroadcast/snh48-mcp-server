# GitHub Copilot Agent 智能审查指南

本指南说明如何使用 GitHub Copilot Agent 来自动审查 PR 并验证 Skills 功能。

## 🎯 目标

利用 GitHub Copilot 的 Agent 能力来：
1. 📖 **理解项目**: Copilot 阅读 SKILL.md，理解所有可用的 Skills
2. 🤖 **自动执行**: Agent 自动运行这些 Skills 进行验证
3. 🧠 **智能评价**: 基于执行结果，给出是否可合并的建议
4. 📝 **生成报告**: 自动在 PR 中发表详细的审查报告

## 🔧 工作流说明

### 已配置的两个 Agent 工作流

#### 1️⃣ `copilot-cli-agent.yml` - CLI Agent 审查
```yaml
触发: PR 创建/更新
功能:
  ✅ 执行所有 Skills 命令
  ✅ 验证返回值格式
  ✅ 生成审查报告
  ✅ 标记 PR 为 ready-to-merge
时间: 2-3 分钟
```

#### 2️⃣ `copilot-advanced-agent.yml` - 高级 Agent 审查
```yaml
触发: PR 创建/更新（推荐使用）
功能:
  ✅ Copilot 深度理解项目
  ✅ 自动验证新增 Skills
  ✅ 评估代码和文档质量
  ✅ 智能合并建议
  ✅ 详细的评分和建议
时间: 2-3 分钟
```

## 📋 PR 审查流程

当你创建 PR 时：

```
1. PR 创建
   ↓
2. GitHub Actions 触发 Copilot Agent
   ├─ test.yml (CI 测试) ✅
   ├─ copilot-cli-agent.yml (Skills 验证) ✅
   └─ copilot-advanced-agent.yml (智能审查) ✅
   ↓
3. Copilot Agent 自动：
   ├─ 执行 snh48-skill query
   ├─ 执行 snh48-skill refresh
   ├─ 执行 snh48-skill shows
   └─ 执行 snh48-skill plan
   ↓
4. Agent 生成审查报告
   ├─ ✅ 所有 Skills 验证通过
   ├─ ✅ 文档检查完成
   ├─ ✅ 代码质量评估
   └─ ✅ 合并建议
   ↓
5. 自动标记和评论
   ├─ 标签: copilot-advanced-reviewed, ready-to-merge
   ├─ 评论: 详细的审查报告
   └─ 链接: 具体建议和后续步骤
```

## 💡 Copilot Agent 如何工作

### Agent 理解的信息源

Copilot Agent 通过以下方式理解项目：

1. **SKILL.md** - Skills 定义和使用说明
   ```markdown
   - 所有 CLI 命令列表
   - 每个命令的用途和参数
   - 返回值说明
   - 使用示例
   ```

2. **README.md** - 项目背景
   ```markdown
   - 项目用途
   - 安装方法
   - 可用功能列表
   ```

3. **项目代码** - 实现细节
   ```python
   - snh48_mcp/ - 核心模块
   - CONTRIBUTING.md - 开发规范
   ```

### Agent 执行的验证

Copilot Agent 会：

1. **解析 PR 改动**
   - 识别改动的文件
   - 理解新增/修改的功能
   - 确定需要验证的 Skills

2. **执行 Skills 验证**
   ```bash
   snh48-skill query "SELECT COUNT(*) FROM members"
   snh48-skill refresh
   snh48-skill shows --gid 1 --days 7
   snh48-skill plan --gid 1 --days 7
   ```

3. **评估执行结果**
   - 返回值是否为 JSON 格式
   - 必需字段是否存在
   - 数据是否合理
   - 是否有错误信息

4. **检查代码和文档**
   - 文档是否更新
   - 代码是否有注释
   - 是否遵循项目规范
   - 是否有安全问题

5. **生成建议**
   - 功能是否完整
   - 是否可以合并
   - 需要改进的地方

## 📊 Copilot Agent 的审查报告

### 报告包含的内容

```markdown
## ✅ 审查通过项
- 新增 Shows 和 Plan Skills
- 代码结构清晰
- 文档完整
- 测试覆盖完善

## ⚠️ 需要改进
（如果有的话）

## 🎯 最终建议
✅ 推荐合并

后续步骤：
1. 获得人工批准
2. 点击合并
3. PR 自动关闭
```

### 样例报告

```
🤖 **Copilot Advanced Agent 审查报告**

## 审查概要
- 标题: Add SNH48 show schedule and ticket status API integration
- 改动文件: 10 个
- 新增行数: 1527

## ✅ 审查通过项
- ✅ 新增了 shows 和 plan 两个 Skills 命令
- ✅ 支持多个 SNH48 团体
- ✅ 代码结构清晰，模块化设计
- ✅ 文档完整（SKILL.md、README.md、CONTRIBUTING.md）
- ✅ 新增了 test_skills.py 测试脚本
- ✅ API 集成正确（JSONP 解析、错误处理）

## 🎯 Copilot Agent 建议
✅ 推荐合并

此 PR 符合所有标准：
1. 功能实现完整
2. 代码质量良好
3. 文档齐全
4. 测试覆盖完善

后续步骤：
1. 获得至少 1 个人工批准
2. 点击 "Squash and merge" 或启用自动合并

Copilot Agent 评分: 9/10 ⭐⭐⭐⭐⭐
```

## 🚀 启用 Copilot Agent 审查

### 前提条件

1. **GitHub Copilot 订阅**
   - 个人: GitHub Copilot 个人版
   - 组织: GitHub Copilot Enterprise
   - 学生: 通过 GitHub Student Developer Pack

2. **仓库配置**
   - 启用 GitHub Actions
   - 配置 Secrets (GITHUB_TOKEN 通常自动提供)
   - 启用 Copilot 访问权限

3. **工作流文件**
   - 已提供: `.github/workflows/copilot-cli-agent.yml`
   - 已提供: `.github/workflows/copilot-advanced-agent.yml`

### 启用步骤

1. **确保工作流文件存在**
   ```
   .github/workflows/
   ├── test.yml
   ├── copilot-agent-review.yml
   ├── copilot-cli-agent.yml                 ← 新增
   ├── copilot-advanced-agent.yml             ← 新增（推荐）
   └── copilot-review.yml
   ```

2. **检查 GitHub Actions 权限**
   - Settings → Actions → General
   - ☑️ Allow GitHub Actions to create and approve pull requests

3. **可选：配置分支保护**
   - Settings → Branches → Branch protection rules
   - ☑️ Require status checks to pass
   - ☑️ Copilot Advanced Agent - 智能审查

4. **创建测试 PR 验证**
   ```bash
   git checkout -b test/copilot-agent
   echo "# Test" >> README.md
   git add README.md
   git commit -m "test: 验证 Copilot Agent"
   git push origin test/copilot-agent
   ```

5. **查看 Agent 报告**
   - 在 GitHub 上打开 PR
   - 等待 Copilot Agent 工作流完成
   - 查看 PR 评论中的审查报告

## 📈 Copilot Agent 的智能特性

### 1. 上下文理解
Agent 会理解：
- PR 改动的真实意图
- 新增功能的业务价值
- 与现有代码的关联性

### 2. 自适应审查
Agent 会：
- 根据改动类型调整检查重点
- 对新功能做更严格的审查
- 对文档改动做内容准确性检查

### 3. 智能建议
Agent 会：
- 给出具体的改进建议
- 提供代码示例
- 解释为什么需要改进

### 4. 整体评分
Agent 会：
- 给出整体代码质量评分（如 9/10）
- 说明评分的理由
- 指出最需要改进的地方

## 🔄 与人工审查的配合

### 工作流

```
Copilot Agent 审查（自动）
    ↓
自动标记 'ready-to-merge'
    ↓
发送 PR 通知（例如 Slack 通知）
    ↓
人工审查（开发者）
    ↓
人工批准（Approve）
    ↓
自动合并（如启用）
```

### 各自的职责

| 审查方 | 职责 | 优势 |
|-------|------|------|
| **Copilot Agent** | 技术审查（功能、代码、文档） | 快速、客观、全面 |
| **人工审查** | 业务审查（需求、设计、规范） | 理解意图、捕捉逻辑错误 |

## 💬 与 Copilot Agent 交互

### 在 PR 评论中请求 Agent 审查

你可以在 PR 评论中直接与 Copilot Agent 交互：

```markdown
@copilot review this PR focusing on:
1. API 性能
2. 错误处理
3. 安全性
```

Agent 会：
- 阅读你的请求
- 重点审查你指定的方面
- 发表补充意见

### 请求特定的验证

```markdown
@copilot verify that:
1. shows 命令能正确处理无数据的情况
2. plan 命令返回的日期格式正确
3. 文档中的示例代码是否可运行
```

Agent 会执行并报告结果。

## 🐛 故障排除

### 问题 1: Agent 没有运行

**原因**: 
- GitHub Copilot 未订阅
- 工作流文件有语法错误
- Actions 权限不足

**解决**:
1. 检查 Actions 日志 (Actions → Workflows)
2. 确认 Copilot 订阅状态
3. 检查工作流 YAML 语法

### 问题 2: Agent 报告不准确

**原因**:
- Agent 理解的上下文不完整
- SKILL.md 说明不够清晰

**解决**:
1. 更新 SKILL.md，添加更详细的说明
2. 添加代码注释，帮助 Agent 理解
3. 在 PR 描述中明确说明改动

### 问题 3: Agent 建议不适用

**原因**:
- PR 有特殊的业务背景
- Agent 的通用建议不适合此项目

**解决**:
1. 在 PR 评论中解释背景
2. 请求 Agent 重新审查
3. 结合人工审查，做最终决定

## 📚 相关资源

### GitHub 官方文档
- [Copilot CLI 介绍](https://docs.github.com/zh/copilot/how-tos/copilot-cli)
- [Copilot 在 Actions 中的使用](https://docs.github.com/zh/copilot/how-tos/copilot-cli/automate-with-actions)
- [GitHub Advanced Security](https://docs.github.com/zh/get-started/learning-about-github/about-github-advanced-security)

### 项目文档
- [SKILL.md](../SKILL.md) - Skills 定义
- [CONTRIBUTING.md](../CONTRIBUTING.md) - 开发指南
- [.github/WORKFLOW_SETUP.md](./WORKFLOW_SETUP.md) - CI/CD 配置

## ✅ 检查清单

- [ ] GitHub Copilot 已订阅
- [ ] `.github/workflows/copilot-advanced-agent.yml` 已创建
- [ ] SKILL.md 定义清晰（Agent 可理解）
- [ ] README.md 说明完整
- [ ] CONTRIBUTING.md 包含开发规范
- [ ] 创建测试 PR 验证 Agent 工作
- [ ] Agent 能正确执行所有 Skills
- [ ] Agent 能生成有用的审查报告
- [ ] 人工审查流程已建立
- [ ] 自动合并已启用（可选）

---

**Copilot Agent 将大幅提高 PR 审查效率，同时保证代码质量！** 🚀
