# GitHub Actions CI/CD 工作流配置指南

本文档说明如何配置 GitHub 分支保护规则，启用 Copilot Agent 自动审查和自动合并功能。

## 🎯 目标

配置 `main` 分支，使 PR 能够自动：
1. 运行 CI 测试
2. Copilot Agent 自动审查
3. 标记为就绪
4. 人工批准后自动合并

## 📋 已配置的工作流

### 1. `test.yml` - CI 测试流水线
- 触发：PR 创建/更新、push 到 main
- 功能：运行 4 个集成测试 + 代码检查
- 时间：3-5 分钟

### 2. `copilot-agent-review.yml` - Copilot Agent 自动审查 ⭐
- 触发：PR 创建/更新（非草稿）
- 功能：
  - 执行所有 Skill 命令验证
  - 检查文档完整性
  - 代码质量检查
  - 生成审查报告
  - 自动标记标签
- 时间：1-2 分钟

### 3. `copilot-review.yml` - 辅助审查
- 触发：CI 测试成功后
- 功能：检查合并条件

## 🔧 配置步骤

### 第 1 步：启用分支保护规则

1. **进入 GitHub 仓库设置**
   ```
   Settings → Branches → Branch protection rules
   ```

2. **创建新规则**
   - 点击 "Add rule"
   - Branch name pattern: `main`

### 第 2 步：配置必需的检查

在 "Protect matching branches" 部分：

#### ✅ 启用这些选项：

1. **Require a pull request before merging**
   - ☑️ Require approvals: **1**
   - ☑️ Require conversation resolution before merging

2. **Require status checks to pass before merging**
   - ☑️ Require branches to be up to date before merging
   - **必需的检查：**
     - ☑️ `SNH48 Skill CI 测试`
     - ☑️ `Copilot Agent 自动审查与验证`

3. **Require code reviews before merging**
   - ☑️ Dismiss stale pull request approvals when new commits are pushed
   - ☑️ Require review from Code Owners（可选）

### 第 3 步：启用自动合并

1. **向下滚动到底部**
2. **启用 "Allow auto-merge"**
   ```
   ☑️ Allow auto-merge
   ```
3. **选择默认合并方式**（推荐 Squash）
   - `Squash and merge` ⭐ 推荐
   - `Rebase and merge`
   - `Create a merge commit`

4. **点击 "Create" 或 "Update"**

### 第 4 步：验证配置

1. **创建测试 PR**
   ```bash
   git checkout -b test/verify-workflow
   echo "# Test" >> README.md
   git add README.md
   git commit -m "test: 验证工作流"
   git push origin test/verify-workflow
   ```

2. **在 GitHub 打开 PR**，应该看到：
   - 🟡 CI 检查正在运行
   - 🟡 Copilot Agent 审查正在运行

3. **等待完成**（5-10 分钟），应该看到：
   - ✅ `SNH48 Skill CI 测试` 通过
   - ✅ `Copilot Agent 自动审查与验证` 通过
   - 🏷️ PR 自动标记 `ci-passed`, `copilot-reviewed`, `ready-to-merge`
   - 📝 Copilot Agent 评论包含审查结果

4. **人工审查（模拟）**
   - 点击 "Review changes" → "Approve"
   - 如启用自动合并，PR 应自动合并

## 📊 完整流程示例

### 工作流执行时间表

```
T+0:00  → PR 创建
         ↓
T+0:05  → test.yml 完成
         ↓
T+0:06  → copilot-agent-review.yml 开始
         ↓
T+0:08  → Copilot Agent 发表审查评论
         ↓
T+0:08  → 自动标记: ci-passed, copilot-reviewed, ready-to-merge
         ↓
⏳      → 等待人工批准 (1 个 Approve)
         ↓
✅      → 自动合并（如启用 auto-merge）
         或
👤      → 手动点击 "Squash and merge"
```

### PR 页面应该显示

```
✅ All checks have passed
  ✅ SNH48 Skill CI 测试 (passed)
  ✅ Copilot Agent 自动审查与验证 (passed)

🏷️ Labels:
  - ci-passed
  - copilot-reviewed
  - ready-to-merge

📝 Comments:
  [Copilot Agent] ✅ CI 测试通过 ...
  [Copilot Agent] 🤖 Copilot Agent 审查完成 ...
  [You] Approved
```

## ⚙️ 高级配置

### 自定义检查要求

如果要求更严格的规则：

1. **要求多个批准**
   ```
   Settings → Branches → main
   Require approvals: 2（或更多）
   ```

2. **要求指定审查者**
   ```
   Settings → Branches → main
   ☑️ Require review from Code Owners
   ```
   然后在 `.github/CODEOWNERS` 中定义

3. **禁用强制推送**
   ```
   ☑️ Restrict who can push to matching branches
   ☑️ Restrict who can dismiss pull request reviews
   ```

### 排除某些 PR

如果需要绕过某些检查（不推荐），可以：
1. PR 描述中添加 `[skip ci]` - 跳过 CI 测试
2. 临时禁用分支保护规则（管理员）

## 🐛 故障排除

### 问题 1：CI 检查一直在 "pending"

**原因**：工作流文件有语法错误或未正确触发

**解决**：
1. 检查 `.github/workflows/*.yml` 文件语法
2. 运行 `yamllint .github/workflows/`
3. 在 GitHub Actions 页面查看日志

### 问题 2：自动合并不工作

**原因**：
1. 未启用 "Allow auto-merge" 选项
2. 检查未全部通过
3. PR 有合并冲突

**解决**：
1. 再次确认 Settings 中启用了 "Allow auto-merge"
2. 检查所有 CI 检查是否为 ✅
3. 解决合并冲突后，自动合并会继续

### 问题 3：Copilot Agent 评论没有出现

**原因**：
1. `copilot-agent-review.yml` 未正确触发
2. PR 是草稿状态（会被跳过）
3. 工作流脚本有错误

**解决**：
1. 确保 PR 不是草稿
2. 在 Actions 页面查看工作流日志
3. 检查 `copilot-agent-review.yml` 的 `if` 条件

## 📚 相关文件

- `.github/workflows/test.yml` - CI 测试
- `.github/workflows/copilot-agent-review.yml` - Copilot 审查 ⭐
- `.github/workflows/copilot-review.yml` - 辅助审查
- `test_skills.py` - 测试脚本
- `CONTRIBUTING.md` - 开发贡献指南

## ✅ 配置检查清单

- [ ] 分支保护规则已创建（针对 `main`）
- [ ] 启用了 "Require status checks to pass"
- [ ] 选择了 `SNH48 Skill CI 测试` 检查
- [ ] 启用了 "Require pull request reviews"（要求 1 个批准）
- [ ] 启用了 "Allow auto-merge"
- [ ] 选择了默认合并方式（推荐 Squash）
- [ ] 使用测试 PR 验证了整个流程
- [ ] CI 测试通过 ✅
- [ ] Copilot Agent 审查通过 ✅
- [ ] 自动标签正确标记 🏷️
- [ ] 人工批准后自动合并正常 ✅

---

完成以上步骤后，仓库将具有**完全自动化的 PR 审查和合并流程**。

Copilot Agent 将自动执行技术审查，人工审查负责代码逻辑，双层保障代码质量！🚀
