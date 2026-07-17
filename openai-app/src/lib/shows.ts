const TICKET_API = "https://api.snh48.com/m/getmtickets.php?callback=cb";
const PLAN_API = "https://api.snh48.com/getevents.php?callback=cb";

const GID_MAP: Record<string, string> = {
  "1": "SNH48",
  "2": "BEJ48",
  "3": "GNZ48",
  "5": "CKG48",
  "6": "CGT48",
};

const GROUP_TO_GID: Record<string, string> = {
  SNH48: "1",
  SNH: "1",
  BEJ48: "2",
  BEJ: "2",
  GNZ48: "3",
  GNZ: "3",
  CKG48: "5",
  CKG: "5",
  CGT48: "6",
  CGT: "6",
};

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  Referer: "https://www.snh48.com/",
};

const HTML_TAG_RE = /<[^>]+>/g;

function parseJsonp(text: string): any {
  const start = text.indexOf("(");
  const end = text.lastIndexOf(")");
  if (start === -1 || end === -1) {
    throw new Error("JSONP 解析失败：找不到括号");
  }
  return JSON.parse(text.slice(start + 1, end));
}

function stripHtml(html: string): string {
  return html
    .replace(HTML_TAG_RE, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

function ticketStatus(item: any): string {
  const vstatus = Number(item.vstatus ?? 0);
  const sstatus = Number(item.sstatus ?? 0);
  const cstatus = Number(item.cstatus ?? 0);
  if (vstatus === 0 && sstatus === 0 && cstatus === 0) return "售罄";
  const parts: string[] = [];
  if (vstatus) parts.push("VIP票有售");
  if (sstatus) parts.push("普通票有售");
  else if (!vstatus && cstatus) parts.push("有售");
  return parts.length ? parts.join("、") : "有售";
}

async function fetchTickets(gid: string): Promise<any[]> {
  const res = await fetch(`${TICKET_API}&gid=${gid}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`票务 API 请求失败: HTTP ${res.status}`);
  const data = parseJsonp(await res.text());
  if (String(data.status) !== "200") {
    throw new Error(`票务 API 返回异常状态: ${data.status}`);
  }
  return data.desc ?? [];
}

async function fetchPlan(gid: string): Promise<any[]> {
  const res = await fetch(`${PLAN_API}&gid=${gid}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`日程 API 请求失败: HTTP ${res.status}`);
  const data = parseJsonp(await res.text());
  if (String(data.status) !== "200") {
    throw new Error(`日程 API 返回异常状态: ${data.status}`);
  }
  return data.desc ?? [];
}

export interface Show {
  date: string;
  time: string;
  datetime: string;
  title: string;
  theme: string;
  team: string;
  venue: string;
  special: string;
  ticket_status: string;
  ticket_url: string;
  group: string;
}

export function resolveGid(group?: string): string {
  if (!group) return "1";
  const key = group.trim().toUpperCase();
  return GROUP_TO_GID[key] ?? (Object.values(GID_MAP).includes(key) ? key : "1") ?? "1";
}

export async function getUpcomingShows(
  group: string | undefined,
  days: number
): Promise<Show[]> {
  const gid = resolveGid(group);
  const groupName = GID_MAP[gid] ?? `gid=${gid}`;
  const rawTickets = await fetchTickets(gid);

  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 86400_000);

  const shows: Show[] = [];
  for (const item of rawTickets) {
    const addtime: string = item.addtime ?? "";
    // Expected format "YYYY-MM-DD HH:MM"
    const dt = new Date(addtime.replace(" ", "T"));
    if (isNaN(dt.getTime())) continue;
    if (!(dt >= now && dt <= cutoff)) continue;

    shows.push({
      date: addtime.slice(0, 10),
      time: addtime.slice(11, 16),
      datetime: addtime,
      title: item.title ?? "",
      theme: item.theme ?? "",
      team: item.teamname ?? "",
      venue: item.theatre_id_name ?? "",
      special: item.special ?? "",
      ticket_status: ticketStatus(item),
      ticket_url: item.vip_url ?? "",
      group: groupName,
    });
  }

  shows.sort((a, b) => a.datetime.localeCompare(b.datetime));
  return shows;
}

export interface PlanEntry {
  date: string;
  year: string;
  title: string;
  clock1: string;
  clock2: string;
  team: string;
  detail: string;
}

export async function getShowPlan(
  group: string | undefined,
  days: number
): Promise<PlanEntry[]> {
  const gid = resolveGid(group);
  const rawPlan = await fetchPlan(gid);

  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 86400_000);

  const result: PlanEntry[] = [];
  for (const item of rawPlan) {
    const addTime = item.add_time;
    let dt: Date | null = null;
    if (addTime) {
      const ts = Number(addTime) * 1000;
      if (!isNaN(ts)) dt = new Date(ts);
    }
    if (dt && !(dt >= now && dt <= cutoff)) continue;

    result.push({
      date: item.time ?? "",
      year: item.year ?? "",
      title: item.title ?? "",
      clock1: item.clock1 ?? "",
      clock2: item.clock2 ?? "",
      team: item.team ?? "",
      detail: stripHtml(item.content ?? ""),
    });
  }
  return result;
}
