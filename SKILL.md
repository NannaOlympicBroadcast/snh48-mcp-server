---
name: snh48
---

# SNH48 Skill

## 何时使用
当用户需要查询 SNH48/GNZ48/BEJ48/CKG48/CGT 在籍成员资料、近期公演安排或票务信息时使用。

## 你可以做什么
1. 执行只读 SQL 查询（仅 `SELECT`）查询成员信息。
2. 获取近期一周的公演场次及票务状态（售罄/有售）。
3. 获取近期公演日程摘要（按天合并视图）。
4. 按 TTL 自动刷新缓存，避免长期使用旧数据。
5. 按需强制刷新最新成员数据。

## 标准流程
### 0) 安装依赖
```bash
pip install -e .
```
### 1) 查询成员
```bash
snh48-skill query "SELECT sname, gname, tname FROM members LIMIT 20"
```

### 2) 获取近期公演及票务信息（默认 SNH48，未来7天）
```bash
snh48-skill shows
```

返回字段说明：
- `date` / `time` / `datetime`：演出日期与时间
- `title`：公演标题
- `theme`：剧目名称
- `team`：演出队伍（s/n/h/x/特殊公演/新生公演等）
- `venue`：演出场地
- `special`：特殊说明（如"限定实名认证"）
- `ticket_status`：票务状态（"VIP票有售"、"普通票有售"、"售罄"等）
- `ticket_url`：购票链接

可选参数：
- `--gid`：团体ID，1=SNH48（默认）、2=BEJ48、3=GNZ48、5=CKG48、6=CGT48
- `--days`：查询未来天数，默认7天

示例：查询 GNZ48 未来14天公演
```bash
snh48-skill shows --gid 3 --days 14
```

### 3) 获取公演日程摘要（按天合并）
```bash
snh48-skill plan
```

返回字段说明：
- `date`：日期（MM.DD 格式）
- `year`：年份
- `title`：当天公演标题（多场合并）
- `clock1` / `clock2`：第一/第二场开演时间
- `team`：团体
- `detail`：纯文本详情（演出内容、参与成员、地址）

可选参数：`--gid`、`--days`（同 shows 命令）

### 4) 强制刷新成员数据
```bash
snh48-skill refresh
```

## 约束
- `query` 子命令只允许 `SELECT` 语句。
- `shows` 和 `plan` 实时请求 api.snh48.com，不缓存（数据随时可能更新）。
- 返回 JSON，请直接解析后再组织成自然语言回复。

## 环境变量
- `SNH48_CACHE_TTL`：成员数据缓存有效期（秒），默认 `3600`
- `SNH48_CACHE_FILE`：成员缓存文件路径，默认 `data/snh48_members.json`
