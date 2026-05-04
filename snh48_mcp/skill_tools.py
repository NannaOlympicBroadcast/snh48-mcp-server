import argparse
import json
import os
from snh48_mcp.member_db import SNH48MemberDB


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


def main() -> None:
    parser = argparse.ArgumentParser(description="SNH48 Agent Skill CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    q = sub.add_parser("query", help="执行只读 SQL 查询（仅 SELECT）")
    q.add_argument("sql", help="SQL 查询语句")

    sub.add_parser("refresh", help="强制刷新成员缓存")

    args = parser.parse_args()

    if args.command == "query":
        print(json.dumps(run_query(args.sql), ensure_ascii=False, indent=2))
    elif args.command == "refresh":
        print(json.dumps(run_refresh(), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
