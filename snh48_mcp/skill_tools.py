import argparse
import json
import os
from snh48_mcp.member_db import SNH48MemberDB
from snh48_mcp.show_db import get_week_shows, get_week_plan


def _db() -> SNH48MemberDB:
    cache_file = os.environ.get("SNH48_CACHE_FILE")
    return SNH48MemberDB(cache_file=cache_file) if cache_file else SNH48MemberDB()


def run_query(sql: str) -> list[dict]:
    ttl = float(os.environ.get("SNH48_CACHE_TTL", "3600"))
    db = _db()
    db.refresh_if_stale(ttl)
    return db.execute_sql(sql)


def run_refresh() -> dict:
    db = _db()
    count = db.refresh()
    return {"success": True, "member_count": count}


def run_shows(gid: str = "1", days: int = 7) -> list[dict]:
    """获取未来 days 天内的公演及票务信息。"""
    return get_week_shows(gid=gid, days=days)


def run_plan(gid: str = "1", days: int = 7) -> list[dict]:
    """获取未来 days 天内的公演日程摘要。"""
    return get_week_plan(gid=gid, days=days)


def main() -> None:
    parser = argparse.ArgumentParser(description="SNH48 Agent Skill CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    q = sub.add_parser("query", help="执行只读 SQL 查询（仅 SELECT）")
    q.add_argument("sql", help="SQL 查询语句")

    sub.add_parser("refresh", help="强制刷新成员缓存")

    shows_p = sub.add_parser("shows", help="获取近期公演及票务信息")
    shows_p.add_argument(
        "--gid",
        default="1",
        help="团体ID：1=SNH48, 2=BEJ48, 3=GNZ48, 5=CKG48, 6=CGT48（默认1）",
    )
    shows_p.add_argument(
        "--days",
        type=int,
        default=7,
        help="查询未来几天内的公演（默认7天）",
    )

    plan_p = sub.add_parser("plan", help="获取近期公演日程摘要（按天合并）")
    plan_p.add_argument(
        "--gid",
        default="1",
        help="团体ID：1=SNH48, 2=BEJ48, 3=GNZ48, 5=CKG48, 6=CGT48（默认1）",
    )
    plan_p.add_argument(
        "--days",
        type=int,
        default=7,
        help="查询未来几天内的日程（默认7天）",
    )

    args = parser.parse_args()

    if args.command == "query":
        print(json.dumps(run_query(args.sql), ensure_ascii=False, indent=2))
    elif args.command == "refresh":
        print(json.dumps(run_refresh(), ensure_ascii=False, indent=2))
    elif args.command == "shows":
        print(json.dumps(run_shows(gid=args.gid, days=args.days), ensure_ascii=False, indent=2))
    elif args.command == "plan":
        print(json.dumps(run_plan(gid=args.gid, days=args.days), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
