# SNH48 Skill

## 何时使用
当用户需要查询 SNH48/GNZ48/BEJ48/CKG48/CGT 在籍成员资料，或需要刷新成员缓存数据时使用。

## 你可以做什么
1. 执行只读 SQL 查询（仅 `SELECT`）。
2. 按 TTL 自动刷新缓存，避免长期使用旧数据。
3. 按需强制刷新最新成员数据。

## 标准流程

### 1) 查询成员
```bash
snh48-skill query "SELECT sname, gname, tname FROM members LIMIT 20"
```

### 2) 强制刷新
```bash
snh48-skill refresh
```

## 约束
- 只允许 `SELECT` 语句。
- 若需要复杂统计，优先在 SQL 中完成聚合后再输出。
- 返回 JSON，请直接解析后再组织成自然语言回复。

## 环境变量
- `SNH48_CACHE_TTL`：缓存有效期（秒），默认 `3600`
- `SNH48_CACHE_FILE`：缓存文件路径，默认 `data/snh48_members.json`
