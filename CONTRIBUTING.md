# 贡献指南

感谢对 SNH48 Skill 项目的兴趣！本文档说明如何参与开发。

## 开发工作流

### 1. 创建分支

从 `main` 创建特性分支：

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### 2. 开发与测试

编辑代码后，运行本地测试：

```bash
# 安装开发依赖
pip install -e .

# 运行集成测试
python test_skills.py

# 或测试单个命令
snh48-skill query "SELECT COUNT(*) FROM members"
snh48-skill shows --gid 1 --days 7
snh48-skill plan --gid 1
```

### 3. 提交与推送

编写清晰的提交信息：

```bash
git add .
git commit -m "feat: 添加新功能简述

可选的详细说明，包括：
- 做了什么
- 为什么这样做
- 有什么副作用"

git push origin feature/your-feature-name
```

### 4. 创建 Pull Request

在 GitHub 上创建 PR，描述：
- **目的**：解决什么问题或增加什么功能
- **实现**：怎么实现的
- **测试**：如何验证功能正常

### 5. 自动 CI 流程

PR 创建后，GitHub Actions 自动运行：

1. **CI 测试** (`.github/workflows/test.yml`)
   - Python 3.11/3.12 双版本测试
   - 4 个集成测试（query、refresh、shows、plan）
   - 代码格式检查
   - 测试通过时自动评论 ✅
   - 测试失败时自动评论 ❌

2. **Copilot 审查** (`.github/workflows/copilot-review.yml`)
   - 自动请求 Copilot 代码审查
   - 检查合并条件
   - 标记 `ci-passed` 标签

### 6. 自动合并

配置 `main` 分支保护规则后，满足以下条件的 PR 可自动合并：
- ✅ 所有 CI 检查通过
- ✅ 至少 1 个批准审查
- ✅ 无合并冲突

## 代码风格

### Python
- Python 3.11+ 语法
- 使用 type hints（类型注解）
- 函数文档注释使用 docstring
- 遵循 PEP 8 规范

示例：
```python
def get_week_shows(gid: str = "1", days: int = 7) -> list[dict]:
    """获取未来 days 天内的公演及票务信息。
    
    Args:
        gid: 团体 ID（1=SNH48, 2=BEJ48 等）
        days: 查询天数，默认 7
    
    Returns:
        公演列表，每条记录包含日期、时间、标题、票务状态等
    """
```

### 提交信息

遵循 Conventional Commits：
- `feat:` - 新功能
- `fix:` - 修复 Bug
- `docs:` - 文档
- `ci:` - CI/CD
- `refactor:` - 重构（不改变功能）
- `test:` - 测试

## 项目结构

```
snh48-mcp-server/
├── snh48_mcp/
│   ├── member_db.py      # 成员数据模块
│   ├── show_db.py        # 公演信息模块（新）
│   └── skill_tools.py    # CLI 入口
├── .github/workflows/
│   ├── test.yml          # 测试流水线
│   └── copilot-review.yml # Copilot 审查
├── test_skills.py        # 集成测试脚本
├── SKILL.md              # Agent 使用说明
└── README.md             # 项目文档
```

## 添加新功能的检查清单

- [ ] 功能已实现并在本地测试通过
- [ ] 新增相关函数都有 docstring
- [ ] 集成测试中添加了新功能的测试用例
- [ ] 更新了 SKILL.md（如果是面向 Agent 的功能）
- [ ] 更新了 README.md（如果是重要新功能）
- [ ] 提交信息清晰且遵循 Conventional Commits

## 测试覆盖

集成测试脚本 (`test_skills.py`) 验证：
- JSON 格式返回值
- 必要字段是否存在
- 数据类型和范围是否合理

新增功能需在 `test_skills.py` 中添加对应测试：

```python
def test_new_feature():
    """测试新功能"""
    print("测试新功能...", end=" ")
    returncode, stdout, stderr = run_command([...])
    
    try:
        data = json.loads(stdout)
        # 验证返回值结构
        assert isinstance(data, list)
        print("✅ 通过")
        return True
    except Exception as e:
        print(f"❌ 失败: {e}")
        return False
```

## 常见问题

### Q: 我的 PR 显示"Merging is blocked"怎么办？
**A:** 这表示还未满足分支保护规则。检查：
1. CI 检查是否全部通过（绿色 ✅）
2. 是否有 1 个批准的审查（Approve）

### Q: 测试失败了怎么办？
**A:** 
1. 查看 GitHub Actions 日志了解具体错误
2. 本地重现问题并修复
3. 推送新的提交，CI 自动重新运行

### Q: 如何跳过 CI 测试？
**A:** 在提交信息中添加 `[skip ci]`（不推荐），例如：
```
docs: 更新 README [skip ci]
```

只有文档更改时才使用。

### Q: 如何请求 Copilot 审查？
**A:** 自动工作流会在 CI 通过后请求。如需手动触发：
1. 在 PR 页面留言 `@copilot-review`
2. 或等待自动流程触发

## 联系方式

- 提交 Issue 报告 Bug
- 提交 PR 提议改进
- 在 PR 评论中讨论

---

感谢贡献！🎉
