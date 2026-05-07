# GitHub Copilot CLI 在 GitHub Actions 中的使用

本指南说明如何在 GitHub Actions 工作流中使用真实的 **GitHub Copilot CLI** 来进行自动审查。

## 📖 官方文档参考

本实现基于：
https://docs.github.com/zh/copilot/how-tos/copilot-cli/automate-copilot-cli/automate-with-actions

## 🎯 核心思路

与其伪造一个智能体，我们真正调用：
1. **`gh copilot ask`** - 向 Copilot 提问并获取分析
2. **`gh copilot explain`** - 让 Copilot 解释代码
3. **`gh`CLI** - 与 GitHub API 交互

## 🔧 工作流配置

### 已配置的工作流

#### 1. `gh-copilot-review.yml` - 基础 Copilot 审查
```yaml
职责:
  - 使用 Copilot CLI 审查 PR
  - 执行项目 Skills 验证
  - 生成审查报告
  - 标记 PR 为已审查

触发: PR 创建/更新
时间: 3-5 分钟
```

#### 2. `gh-copilot-ask.yml` - Ask 命令审查
```yaml
职责:
  - 使用 'gh copilot ask' 提问
  - 执行 Skills 验证并记录结果
  - Copilot 分析代码改动
  - 生成智能审查报告

触发: PR 创建/更新
时间: 3-5 分钟
推荐: ⭐ 此工作流
```

## 📋 `gh copilot` 命令详解

### 1. `gh copilot ask` - 提问和获取建议

```bash
# 基本用法
gh copilot ask "你的问题"

# 在工作流中的用法
gh copilot ask "这个 PR 添加了哪些新的 Skill 命令？"
```

**何时使用：**
- 需要 Copilot 分析代码改动
- 需要 Copilot 的建议和解释
- 需要 Copilot 理解项目上下文

### 2. `gh copilot explain` - 解释代码

```bash
# 解释一个文件
gh copilot explain /path/to/file.py

# 在工作流中的用法
gh copilot explain snh48_mcp/show_db.py
```

**何时使用：**
- 需要理解新增的代码
- 需要验证代码的正确性

### 3. GitHub CLI 基础

```bash
# 获取 PR 信息
gh pr view <PR_NUMBER> --json title,body,files

# 获取改动文件
gh pr diff <PR_NUMBER>

# 发表评论
gh pr comment <PR_NUMBER> --body "评论内容"

# 添加标签
gh pr label <PR_NUMBER> --add label1,label2
```

## 🤖 工作流执行流程

### 执行步骤

```
1. PR 创建
   ↓
2. GitHub Actions 触发工作流
   ├─ 检出代码
   ├─ 设置 Python 环境
   ├─ 安装项目依赖
   └─ 初始化 GitHub CLI
   ↓
3. 使用 Copilot CLI
   ├─ gh copilot ask "分析这个 PR..."
   ├─ Copilot 理解项目架构
   ├─ Copilot 读取 SKILL.md
   ├─ Copilot 分析改动内容
   └─ Copilot 生成建议
   ↓
4. 验证 Skills
   ├─ 执行 query 命令
   ├─ 执行 shows 命令
   ├─ 执行 plan 命令
   └─ 记录执行结果
   ↓
5. 生成报告
   ├─ 收集 Copilot 分析
   ├─ 整合 Skills 验证结果
   ├─ 生成结构化报告
   └─ 发表 PR 评论
   ↓
6. 标记 PR
   ├─ 添加 'copilot-analyzed' 标签
   ├─ 添加 'ready-for-human-review' 标签
   └─ PR 成为可合并状态
```

## 📊 Copilot 分析示例

### Copilot 会分析的内容

#### 1. **功能理解**
```
问题: "这个 PR 添加了什么新功能？"

Copilot 回答:
✅ 添加了两个新的 Skill 命令：
   - snh48-skill shows：查询近期公演和票务信息
   - snh48-skill plan：查询演出日程摘要
✅ 支持多个 SNH48 团体（SNH48/BEJ48/GNZ48 等）
✅ 参数设计合理
```

#### 2. **代码质量评估**
```
问题: "代码有什么问题吗？"

Copilot 回答:
✅ 模块化设计清晰
✅ 错误处理完善
✅ 代码风格一致
✅ 注释适当
⚠️ 可以添加更多类型注解（type hints）
```

#### 3. **文档检查**
```
问题: "文档是否完整？"

Copilot 回答:
✅ SKILL.md 已更新，新增 shows 和 plan 命令说明
✅ README.md 包含 CI/CD 流程说明
✅ CONTRIBUTING.md 说明开发规范
⚠️ 考虑添加常见问题 (FAQ) 部分
```

#### 4. **合并建议**
```
问题: "这个 PR 是否符合合并条件？"

Copilot 回答:
✅ 功能完整，所有 Skills 正常工作
✅ 代码质量良好，遵循项目规范
✅ 文档齐全，便于理解
✅ 测试覆盖完善
✅ 建议合并
```

## 🚀 启用 Copilot CLI 工作流

### 前置条件

1. **GitHub Copilot 订阅**
   ```
   个人: GitHub Copilot Individual
   组织: GitHub Copilot Business/Enterprise
   学生: GitHub Student Developer Pack
   ```

2. **GitHub CLI 版本**
   ```bash
   # 需要最新版本（2.20.0 或更高）
   gh --version
   ```

3. **gh copilot 命令可用性**
   ```bash
   # 检查 copilot 子命令是否可用
   gh copilot --help
   ```

### 启用步骤

1. **确保工作流文件存在**
   ```
   .github/workflows/
   ├─ gh-copilot-review.yml         ← 新增
   ├─ gh-copilot-ask.yml            ← 新增（推荐）
   └─ ... (其他工作流)
   ```

2. **配置 GitHub Actions 权限**
   ```
   Settings → Actions → General
   ☑️ Allow GitHub Actions to create and approve pull requests
   ☑️ Read and write permissions
   ```

3. **验证 Copilot 授权**
   ```
   Settings → Personal access tokens (或 Repository secrets)
   确保 GITHUB_TOKEN 有足够权限调用 Copilot
   ```

4. **创建测试 PR 验证**
   ```bash
   git checkout -b test/gh-copilot
   echo "test" >> test.txt
   git add test.txt
   git commit -m "test: 验证 gh copilot 工作流"
   git push origin test/gh-copilot
   ```

5. **在 GitHub 上打开 PR 并等待**
   - 工作流应在 3-5 分钟内完成
   - 查看 Actions 标签页查看执行日志
   - 查看 PR 评论查看 Copilot 的分析结果

## 📝 工作流中的 Copilot 调用示例

### 示例 1: 基本提问

```bash
#!/bin/bash
PR_NUMBER=${{ github.event.pull_request.number }}

# 使用 Copilot 分析这个 PR
gh copilot ask "
  请分析 Pull Request #${PR_NUMBER}：
  1. 这个 PR 做了什么改动？
  2. 新增的功能是否有对应的测试？
  3. 代码质量如何？
  4. 是否建议合并？
  
  项目信息：
  - 项目支持的命令在 SKILL.md 中定义
  - 有完整的测试框架
  - 使用 Python 3.11+
"
```

### 示例 2: 代码解释

```bash
#!/bin/bash
# 让 Copilot 解释新增的代码
gh copilot explain snh48_mcp/show_db.py

# 或解释特定功能
gh copilot ask "snh48_mcp/show_db.py 中的 get_week_shows() 函数做什么？"
```

### 示例 3: 综合分析

```bash
#!/bin/bash
# 获取 PR 信息
PR_INFO=$(gh pr view $PR_NUMBER --json title,body,files)

# 让 Copilot 进行综合分析
ANALYSIS=$(gh copilot ask "
  基于以下 PR 信息进行分析：
  $PR_INFO
  
  请给出：
  1. 新增功能总结
  2. 代码质量评分（1-10）
  3. 是否建议合并的理由
")

echo "$ANALYSIS"
```

## 🔍 工作流日志查看

### 查看工作流执行

1. **在 GitHub 上查看**
   - 打开仓库 → Actions 标签页
   - 选择对应的工作流
   - 查看每个 step 的日志

2. **本地查看日志**
   ```bash
   gh run list --repo owner/repo --limit 10
   gh run view RUN_ID --log
   ```

3. **调试技巧**
   ```bash
   # 启用 debug 日志
   export ACTIONS_STEP_DEBUG=true
   ```

## ⚠️ 常见问题

### 问题 1: `gh copilot` 命令不可用

**原因:**
- 未安装最新版本的 GitHub CLI
- Copilot 未订阅或未启用
- 当前环境不支持 Copilot CLI

**解决:**
```bash
# 升级 GitHub CLI
gh version upgrade

# 检查 Copilot 状态
gh auth status

# 验证 Copilot 可用
gh copilot --help
```

### 问题 2: 工作流执行失败

**原因:**
- GITHUB_TOKEN 权限不足
- Copilot 无访问权限
- 网络连接问题

**解决:**
```bash
# 检查权限
gh auth status

# 重新授权
gh auth login
```

### 问题 3: Copilot 分析不准确

**原因:**
- SKILL.md 定义不够清晰
- 项目上下文信息不足
- Copilot 需要更多代码示例

**解决:**
- 更新 SKILL.md，添加更详细的说明
- 在 PR 描述中补充背景信息
- 添加代码注释帮助 Copilot 理解

## 📚 相关资源

### 官方文档
- [GitHub Copilot CLI - Automating with Actions](https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/automate-with-actions)
- [GitHub CLI Manual](https://cli.github.com/manual/)
- [Copilot CLI Usage](https://docs.github.com/en/copilot/how-tos/copilot-cli)

### 项目文档
- [SKILL.md](../) - Skills 定义（Copilot 会分析）
- [README.md](../) - 项目概览
- [CONTRIBUTING.md](../) - 开发指南

## ✅ 检查清单

- [ ] GitHub Copilot 已订阅
- [ ] GitHub CLI 已升级到最新版本
- [ ] `gh copilot` 命令可用
- [ ] `.github/workflows/gh-copilot-*.yml` 文件已上传
- [ ] GitHub Actions 权限已配置
- [ ] SKILL.md 定义清晰（便于 Copilot 理解）
- [ ] 创建测试 PR 验证工作流
- [ ] 工作流成功运行并生成分析报告
- [ ] Copilot 分析的建议有用且准确

---

## 🎉 总结

通过在 GitHub Actions 中使用真实的 **GitHub Copilot CLI**，我们实现了：

1. ✅ **真实的 AI 分析** - 而不是伪造
2. ✅ **项目理解** - Copilot 读懂 SKILL.md 和代码
3. ✅ **自动验证** - 执行 Skills 并验证结果
4. ✅ **智能建议** - 基于 Copilot 的代码审查
5. ✅ **高效协作** - 与人工审查完美配合

这是一个完全自动化的、由真实 AI 驱动的 PR 审查系统！
