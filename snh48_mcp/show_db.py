"""
SNH48 公演与票务信息模块
从 api.snh48.com 拉取近期公演及票务状态，支持按日期过滤。
"""

import json
import logging
import re
from datetime import datetime, timedelta

import requests

logger = logging.getLogger(__name__)

_TICKET_API = "https://api.snh48.com/m/getmtickets.php?callback=cb"
_PLAN_API = "https://api.snh48.com/getevents.php?callback=cb"

_GID_MAP = {
    "1": "SNH48",
    "2": "BEJ48",
    "3": "GNZ48",
    "5": "CKG48",
    "6": "CGT48",
}

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
    ),
    "Referer": "https://www.snh48.com/",
}

_HTML_TAG_RE = re.compile(r"<[^>]+>")


def _parse_jsonp(text: str) -> dict:
    start = text.find("(")
    end = text.rfind(")")
    if start == -1 or end == -1:
        raise ValueError("JSONP 格式解析失败，找不到括号")
    return json.loads(text[start + 1 : end])


def _ticket_status(item: dict) -> str:
    """将 vstatus/sstatus/cstatus 转为可读票务状态文字。"""
    vstatus = int(item.get("vstatus", 0))
    sstatus = int(item.get("sstatus", 0))
    cstatus = int(item.get("cstatus", 0))

    if vstatus == 0 and sstatus == 0 and cstatus == 0:
        return "售罄"

    parts = []
    if vstatus:
        parts.append("VIP票有售")
    if sstatus:
        parts.append("普通票有售")
    elif not vstatus and cstatus:
        parts.append("有售")
    return "、".join(parts) if parts else "有售"


def _strip_html(html: str) -> str:
    text = _HTML_TAG_RE.sub("\n", html)
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    return "\n".join(lines)


def _fetch_tickets(gid: str) -> list[dict]:
    url = f"{_TICKET_API}&gid={gid}"
    logger.info("正在从票务 API 拉取公演数据（gid=%s）...", gid)
    resp = requests.get(url, headers=_HEADERS, timeout=30)
    resp.raise_for_status()
    data = _parse_jsonp(resp.text)
    if str(data.get("status")) != "200":
        raise ValueError(f"票务 API 返回异常状态: {data.get('status')}")
    return data.get("desc", [])


def _fetch_plan(gid: str) -> list[dict]:
    url = f"{_PLAN_API}&gid={gid}"
    logger.info("正在从日程 API 拉取公演计划（gid=%s）...", gid)
    resp = requests.get(url, headers=_HEADERS, timeout=30)
    resp.raise_for_status()
    data = _parse_jsonp(resp.text)
    if str(data.get("status")) != "200":
        raise ValueError(f"日程 API 返回异常状态: {data.get('status')}")
    return data.get("desc", [])


def _build_ticket_index(tickets: list[dict]) -> dict[str, dict]:
    """以 addtime 日期为键，将票务条目按场次聚合，便于与日程合并。"""
    index: dict[str, list[dict]] = {}
    for t in tickets:
        date = t.get("addtime", "")[:10]  # "YYYY-MM-DD"
        index.setdefault(date, []).append(t)
    return index


def get_week_shows(gid: str = "1", days: int = 7) -> list[dict]:
    """
    获取未来 days 天内的公演及票务信息。

    每场公演返回字段：
      - date       演出日期 YYYY-MM-DD
      - time       开演时间 HH:MM
      - datetime   完整时间 YYYY-MM-DD HH:MM
      - title      公演标题
      - theme      剧目名称
      - team       演出队伍
      - venue      演出场地
      - special    特殊说明（如"限定实名认证"）
      - ticket_status  票务状态（"VIP票有售"/"普通票有售"/"售罄"等）
      - ticket_url     购票链接
      - group      团体名称（SNH48/BEJ48 等）
    """
    gid = str(gid)
    group_name = _GID_MAP.get(gid, f"gid={gid}")

    raw_tickets = _fetch_tickets(gid)

    now = datetime.now()
    cutoff = now + timedelta(days=days)

    shows = []
    for item in raw_tickets:
        addtime = item.get("addtime", "")
        try:
            dt = datetime.strptime(addtime, "%Y-%m-%d %H:%M")
        except ValueError:
            continue
        if not (now <= dt <= cutoff):
            continue

        shows.append(
            {
                "date": dt.strftime("%Y-%m-%d"),
                "time": dt.strftime("%H:%M"),
                "datetime": addtime,
                "title": item.get("title", ""),
                "theme": item.get("theme", ""),
                "team": item.get("teamname", ""),
                "venue": item.get("theatre_id_name", ""),
                "special": item.get("special", ""),
                "ticket_status": _ticket_status(item),
                "ticket_url": item.get("vip_url", ""),
                "group": group_name,
            }
        )

    shows.sort(key=lambda x: x["datetime"])
    return shows


def get_week_plan(gid: str = "1", days: int = 7) -> list[dict]:
    """
    获取未来 days 天内的公演日程摘要（来自日程 API，每天合并为一条）。

    每条记录字段：
      - date       日期 MM.DD
      - year       年份
      - title      日程标题
      - clock1     第一场开演时间
      - clock2     第二场开演时间（可为空）
      - team       团体标签
      - detail     纯文本详情（去除 HTML 标签后的内容）
    """
    gid = str(gid)
    raw_plan = _fetch_plan(gid)

    now = datetime.now()
    cutoff = now + timedelta(days=days)

    result = []
    for item in raw_plan:
        add_time = item.get("add_time")
        if add_time:
            try:
                dt = datetime.fromtimestamp(int(add_time))
            except (ValueError, OSError):
                dt = None
        else:
            dt = None

        if dt and not (now <= dt <= cutoff):
            continue

        result.append(
            {
                "date": item.get("time", ""),
                "year": item.get("year", ""),
                "title": item.get("title", ""),
                "clock1": item.get("clock1", ""),
                "clock2": item.get("clock2", ""),
                "team": item.get("team", ""),
                "detail": _strip_html(item.get("content", "")),
            }
        )

    return result
