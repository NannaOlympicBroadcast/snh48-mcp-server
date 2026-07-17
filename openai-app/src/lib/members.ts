export interface Member {
  sid: string;
  gid: string;
  gname: string;
  sname: string;
  fname: string;
  pinyin: string;
  abbr: string;
  tid: string;
  tname: string;
  pid: string;
  pname: string;
  nickname: string;
  company: string;
  join_day: string;
  height: string;
  birth_day: string;
  star_sign_12: string;
  star_sign_48: string;
  birth_place: string;
  speciality: string;
  hobby: string;
  experience: string;
  catch_phrase: string;
  weibo_uid: string;
  blood_type: string;
  status: string;
  ranking: string;
  pocket_id: string;
  is_group_new: string;
  tcolor: string;
  gcolor: string;
}

const API_URL =
  "https://h5.48.cn/resource/jsonp/allmembers.php?gid=00&callback=get_members_success";

const CACHE_TTL_MS = Number(process.env.SNH48_CACHE_TTL ?? "3600") * 1000;

let _cache: { members: Member[]; fetchedAt: number } | null = null;

function parseJsonp(text: string): any {
  const start = text.indexOf("(");
  const end = text.lastIndexOf(")");
  if (start === -1 || end === -1) {
    throw new Error("JSONP 解析失败：找不到括号");
  }
  return JSON.parse(text.slice(start + 1, end));
}

async function fetchMembers(): Promise<Member[]> {
  const res = await fetch(API_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  if (!res.ok) {
    throw new Error(`成员 API 请求失败: HTTP ${res.status}`);
  }
  const data = parseJsonp(await res.text());
  return (data.rows ?? []) as Member[];
}

export async function getMembers(forceRefresh = false): Promise<Member[]> {
  const now = Date.now();
  if (
    !forceRefresh &&
    _cache &&
    now - _cache.fetchedAt < CACHE_TTL_MS
  ) {
    return _cache.members;
  }
  try {
    const members = await fetchMembers();
    _cache = { members, fetchedAt: now };
    return members;
  } catch (err) {
    if (_cache) {
      // 拉取失败时退回旧缓存，保证可用性
      return _cache.members;
    }
    throw err;
  }
}

// 团体名归一化：接受 "SNH48"/"SNH"/"snh" 等多种写法
const GROUP_ALIASES: Record<string, string> = {
  snh48: "SNH",
  snh: "SNH",
  gnz48: "GNZ",
  gnz: "GNZ",
  bej48: "BEJ",
  bej: "BEJ",
  ckg48: "CKG",
  ckg: "CKG",
  cgt48: "CGT",
  cgt: "CGT",
};

export function normalizeGroup(input?: string): string | undefined {
  if (!input) return undefined;
  const key = input.trim().toLowerCase();
  return GROUP_ALIASES[key] ?? input.trim().toUpperCase();
}

const TEAM_ALIASES: Record<string, string> = {
  s: "SII",
  sii: "SII",
  n: "NII",
  nii: "NII",
  h: "HII",
  hii: "HII",
  x: "X",
};

export function normalizeTeam(input?: string): string | undefined {
  if (!input) return undefined;
  const key = input.trim().toLowerCase();
  return TEAM_ALIASES[key] ?? input.trim().toUpperCase();
}

export interface SearchMembersParams {
  keyword?: string;
  group?: string;
  team?: string;
  generation?: string;
  birthplace?: string;
  includeInactive?: boolean;
  limit?: number;
}

export async function searchMembers(
  params: SearchMembersParams
): Promise<{ members: Member[]; total: number }> {
  const all = await getMembers();
  const group = normalizeGroup(params.group);
  const team = normalizeTeam(params.team);
  const keyword = params.keyword?.trim().toLowerCase();
  const generation = params.generation?.trim().toLowerCase();
  const birthplace = params.birthplace?.trim().toLowerCase();

  const filtered = all.filter((m) => {
    if (!params.includeInactive && m.status !== "99") return false;
    if (group && m.gname !== group) return false;
    if (team && m.tname !== team) return false;
    if (generation && !m.pname.toLowerCase().includes(generation))
      return false;
    if (birthplace && !m.birth_place.toLowerCase().includes(birthplace))
      return false;
    if (keyword) {
      const haystack = [m.sname, m.pinyin, m.abbr, m.nickname]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });

  const limit = Math.min(Math.max(params.limit ?? 24, 1), 48);
  return { members: filtered.slice(0, limit), total: filtered.length };
}

export function memberExperienceText(m: Member): string {
  return m.experience.replace(/<br\s*\/?>/gi, "\n").trim();
}
