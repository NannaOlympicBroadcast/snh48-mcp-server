"""
SNH48 成员数据库模块
从 h5.48.cn API 拉取全部成员数据，缓存到本地 JSON，并导入 SQLite 内存数据库。
"""

import os
import json
import sqlite3
import logging
import pathlib
import requests

logger = logging.getLogger(__name__)

# API URL（JSONP 格式）
_API_URL = "https://h5.48.cn/resource/jsonp/allmembers.php?gid=00&callback=get_members_success"

# 默认缓存文件路径（相对于本模块所在包的上两层，即项目根目录的 data/ 下）
_DEFAULT_CACHE_FILE = pathlib.Path(__file__).parent.parent.parent / "data" / "snh48_members.json"

# SQLite 表结构（所有字段均为 TEXT，与原始 JSON 保持一致）
_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS members (
    sid          TEXT PRIMARY KEY, -- 成员唯一ID
    gid          TEXT,             -- 团体ID (SNH48=10, GNZ48=20, BEJ48=30, CKG48=50, CGT48=60)
    gname        TEXT,             -- 团体简称 (SNH, GNZ, BEJ, CKG, CGT)
    sname        TEXT,             -- 成员中文名
    fname        TEXT,             -- 分字格式姓名
    pinyin       TEXT,             -- 拼音名
    abbr         TEXT,             -- 姓名缩写
    tid          TEXT,             -- 队伍ID (SII=101, NII=102, HII=103, X=104)
    tname        TEXT,             -- 队伍简称 (SII, NII, HII, X)
    pid          TEXT,             -- 期数ID
    pname        TEXT,             -- 期数名称 (如 "SNH48 五期生")
    nickname     TEXT,             -- 昵称，多个用顿号分隔
    company      TEXT,             -- 所属公司
    join_day     TEXT,             -- 加入日期 (YYYY-MM-DD)
    height       TEXT,             -- 身高 (cm)
    birth_day    TEXT,             -- 生日 (MM.DD)
    star_sign_12 TEXT,             -- 十二星座
    star_sign_48 TEXT,             -- 48自定义星座
    birth_place  TEXT,             -- 出生地 (如 "中国 四川 ")
    speciality   TEXT,             -- 特长
    hobby        TEXT,             -- 爱好
    experience   TEXT,             -- 成员经历 (含HTML <br> 换行)
    catch_phrase TEXT,             -- 口号/自我介绍
    weibo_uid    TEXT,             -- 微博UID ("0" 表示无)
    blood_type   TEXT,             -- 血型 ("-" 表示未知)
    status       TEXT,             -- 状态 ("99" 表示在籍)
    ranking      TEXT,             -- 最新年度盛典排名 ("0" 未上榜)
    pocket_id    TEXT,             -- 口袋48 ID ("0" 表示无账号)
    is_group_new TEXT,             -- 是否新成员 ("1" 是, "0" 否)
    tcolor       TEXT,             -- 队伍颜色Hex (无#)
    gcolor       TEXT              -- 团体颜色Hex (无#)
)
"""

# 全部字段列表（与 CREATE TABLE 保持一致）
_FIELDS = [
    "sid", "gid", "gname", "sname", "fname", "pinyin", "abbr",
    "tid", "tname", "pid", "pname", "nickname", "company", "join_day",
    "height", "birth_day", "star_sign_12", "star_sign_48", "birth_place",
    "speciality", "hobby", "experience", "catch_phrase", "weibo_uid",
    "blood_type", "status", "ranking", "pocket_id", "is_group_new",
    "tcolor", "gcolor",
]


class SNH48MemberDB:
    """SNH48 成员数据库，支持 SQL 查询。"""

    def __init__(self, cache_file: str | pathlib.Path | None = None):
        self.cache_file = pathlib.Path(cache_file) if cache_file else _DEFAULT_CACHE_FILE
        self._conn: sqlite3.Connection | None = None
        self._load()

    # ------------------------------------------------------------------
    # 数据拉取与加载
    # ------------------------------------------------------------------

    def _fetch_and_save(self) -> list[dict]:
        """从 API 拉取 JSONP，解析并保存到本地 JSON 缓存。返回成员列表。"""
        logger.info("正在从 SNH48 API 拉取成员数据...")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = requests.get(_API_URL, headers=headers, timeout=30)
        response.raise_for_status()

        text = response.text
        start = text.find("(")
        end = text.rfind(")")
        if start == -1 or end == -1:
            raise ValueError("JSONP 格式解析失败，找不到括号")

        data = json.loads(text[start + 1: end])
        members = data.get("rows", [])

        self.cache_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.cache_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        logger.info(f"成功拉取并保存 {len(members)} 位成员数据 → {self.cache_file}")
        return members

    def _load_from_cache(self) -> list[dict]:
        """从本地 JSON 缓存加载成员列表。"""
        with open(self.cache_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        members = data.get("rows", [])
        logger.info(f"从缓存加载 {len(members)} 位成员数据")
        return members

    def _build_db(self, members: list[dict]):
        """将成员列表导入 SQLite 内存数据库。"""
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        conn.execute(_CREATE_TABLE_SQL)

        placeholders = ", ".join(["?"] * len(_FIELDS))
        insert_sql = f"INSERT OR REPLACE INTO members VALUES ({placeholders})"

        rows = [tuple(m.get(f, "") for f in _FIELDS) for m in members]
        conn.executemany(insert_sql, rows)
        conn.commit()

        if self._conn:
            self._conn.close()
        self._conn = conn
        logger.info(f"SQLite 内存数据库构建完成，共 {len(rows)} 行")

    def _load(self):
        """启动时加载数据：无缓存则先从 API 拉取。"""
        if not self.cache_file.exists():
            members = self._fetch_and_save()
        else:
            members = self._load_from_cache()
        self._build_db(members)

    # ------------------------------------------------------------------
    # 公开接口
    # ------------------------------------------------------------------

    def refresh(self) -> int:
        """强制从 API 重新拉取数据并重建数据库。返回成员数量。"""
        members = self._fetch_and_save()
        self._build_db(members)
        return len(members)

    def execute_sql(self, sql: str) -> list[dict]:
        """
        执行只读 SQL 查询，返回结果列表。
        仅允许 SELECT 语句，禁止 INSERT/UPDATE/DELETE/DROP 等写操作。
        """
        stripped = sql.strip().upper()
        if not stripped.startswith("SELECT"):
            raise ValueError("仅允许 SELECT 查询语句")

        cursor = self._conn.execute(sql)
        columns = [desc[0] for desc in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]

    @property
    def member_count(self) -> int:
        """当前数据库中的成员数量。"""
        row = self._conn.execute("SELECT COUNT(*) FROM members").fetchone()
        return row[0]
