"""
SNH48 MCP 服务器 - 成员查询模块

提供两个 MCP 工具：
  - query_members_sql: 使用 SQL 查询成员数据（详见工具说明中的 schema）
  - refresh_member_data: 强制从 API 重新拉取并重建数据库
"""

import os
import logging
from fastmcp import FastMCP
from snh48_mcp.member_db import SNH48MemberDB

logging.basicConfig(level=logging.INFO)

mcp = FastMCP("SNH48 MCP Server")

# 缓存 TTL（秒）：每次 session 开始（_last_refresh_time=0）或距上次刷新超过此时长时自动重新拉取
# 可通过环境变量 SNH48_CACHE_TTL 覆盖，默认 3600 秒（1 小时）
_CACHE_TTL = float(os.environ.get("SNH48_CACHE_TTL", "3600"))

# 全局数据库实例（服务启动时加载本地缓存，首次工具调用时触发刷新）
_db = SNH48MemberDB()


@mcp.tool()
def query_members_sql(sql: str) -> list[dict]:
    """
    对 SNH48 成员数据库执行 SQL 查询，返回匹配的成员记录列表。
    【重要】仅支持 SELECT 语句，禁止 INSERT / UPDATE / DELETE / DROP 等写操作。

    ═══════════════════════════════════════════════════
    数据库表名：members
    总记录数：约 715 条（含 SNH48、GNZ48、BEJ48、CKG48、CGT48 全部在籍成员）
    ═══════════════════════════════════════════════════

    【字段说明】

    身份字段：
      sid          TEXT  成员唯一ID（主键），如 "10125"
      sname        TEXT  成员中文名，如 "刘增艳"
      fname        TEXT  分字格式姓名，如 "刘 增艳"
      pinyin       TEXT  拼音名，如 "Liu ZengYan"
      abbr         TEXT  姓名缩写，如 "LZY"
      nickname     TEXT  昵称，多个用顿号分隔，如 "增锅、增增"
      catch_phrase TEXT  口号/自我介绍语

    团体与队伍（重要枚举值）：
      gid    TEXT  团体ID  → SNH48=10, GNZ48=20, BEJ48=30, CKG48=50, CGT48=60
      gname  TEXT  团体简称 → "SNH" | "GNZ" | "BEJ" | "CKG" | "CGT"
      tid    TEXT  队伍ID  → SII=101, NII=102, HII=103, X=104（SNH48队伍）
      tname  TEXT  队伍简称 → "SII" | "NII" | "HII" | "X"
               SNH48具体队伍：Team SII（S队）| Team NII（N队）| Team HII（H队）| Team X（X队）

    期数：
      pid    TEXT  期数ID
      pname  TEXT  期数全称，如 "SNH48 五期生"、"GNZ48 三期生"

    个人信息：
      company      TEXT  所属公司（均为"上海丝芭文化传媒集团有限公司"）
      join_day     TEXT  加入日期，格式 YYYY-MM-DD，如 "2015-07-25"
      height       TEXT  身高（cm），如 "157"
      birth_day    TEXT  生日，格式 MM.DD，如 "08.31"
      star_sign_12 TEXT  十二星座，如 "处女座"
      star_sign_48 TEXT  48自定义星座
      birth_place  TEXT  出生地，格式 "中国 省份 "，如 "中国 四川 "
                         常见省份：上海、北京、四川、江苏、浙江、湖南、河南等
      blood_type   TEXT  血型，如 "A" | "B" | "O" | "AB" | "-"（"-"表示未知）
      speciality   TEXT  特长
      hobby        TEXT  爱好
      experience   TEXT  成员经历（含HTML <br> 换行标签，记录加入日期、历届总决选成绩等）

    社媒与状态：
      weibo_uid    TEXT  微博UID，如 "5681431767"（"0" 表示无微博）
      status       TEXT  状态，"99" 表示在籍
      ranking      TEXT  最新年度盛典排名，如 "6"（"0" 表示未上榜）
      pocket_id    TEXT  口袋48 App 用户ID（"0" 表示无账号）
      is_group_new TEXT  是否新成员，"1"=是，"0"=否

    颜色（仅供展示）：
      tcolor TEXT  队伍主题色 Hex（无#），如 "91cdeb"
      gcolor TEXT  团体主题色 Hex（无#），如 "8ed2f5"

    ═══════════════════════════════════════════════════
    【示例查询】

    -- 按姓名模糊搜索
    SELECT sid, sname, pinyin, gname, tname, pname FROM members WHERE sname LIKE '%段艺璇%'

    -- 查询 SNH48 Team SII 全部成员
    SELECT sname, pinyin, birth_place, height FROM members WHERE gname='SNH' AND tname='SII'

    -- 统计各队伍人数
    SELECT gname, tname, COUNT(*) AS cnt FROM members GROUP BY gname, tname ORDER BY gname, cnt DESC

    -- 查询来自四川的成员
    SELECT sname, gname, tname, birth_place FROM members WHERE birth_place LIKE '%四川%'

    -- 查询身高最高的10位成员
    SELECT sname, gname, tname, CAST(height AS INTEGER) AS h FROM members WHERE height != '' ORDER BY h DESC LIMIT 10

    -- 查询有口袋48账号的成员
    SELECT sname, tname, pocket_id FROM members WHERE pocket_id != '0' ORDER BY tname

    -- 查询最新年度盛典前10
    SELECT sname, gname, tname, CAST(ranking AS INTEGER) AS r FROM members WHERE ranking != '0' ORDER BY r LIMIT 10
    ═══════════════════════════════════════════════════

    Args:
        sql: 要执行的 SELECT SQL 语句

    Returns:
        查询结果列表，每条记录为字典（字段名 → 值）。
    """
    try:
        # 每次工具调用前检查 TTL，过期则自动刷新（覆盖 session 开始和长时间间隔两种场景）
        _db.refresh_if_stale(_CACHE_TTL)
        results = _db.execute_sql(sql)
        return results
    except ValueError as e:
        return [{"error": str(e)}]
    except Exception as e:
        return [{"error": f"SQL 执行错误: {str(e)}"}]


@mcp.tool()
def refresh_member_data() -> dict:
    """
    强制从 SNH48 官方 API 重新拉取最新成员数据，并重建本地 SQLite 数据库。

    适用场景：有新成员加入、成员移籍或其他信息更新时手动触发刷新。
    注意：操作会覆盖本地 JSON 缓存文件。

    Returns:
        包含操作结果的字典，格式：{"success": bool, "member_count": int, "message": str}
    """
    try:
        count = _db.refresh()
        return {
            "success": True,
            "member_count": count,
            "message": f"成功从 API 刷新数据，共载入 {count} 位成员。",
        }
    except Exception as e:
        return {
            "success": False,
            "member_count": _db.member_count,
            "message": f"刷新失败：{str(e)}",
        }


if __name__ == "__main__":
    mcp.run()
