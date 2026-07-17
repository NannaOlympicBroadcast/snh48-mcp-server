export function photoUrl(baseUrl: string, sid: string, sname: string, color: string): string {
  const params = new URLSearchParams({ sid, name: sname, color });
  return `${baseUrl}/api/img?${params.toString()}`;
}

export function officialPhotoSource(sid: string): string {
  return `https://www.snh48.com/images/member/zp_${encodeURIComponent(sid)}.jpg`;
}

/** 生成成员姓名首字（用于占位头像），优先取中文名最后一个字，兼容拼音。 */
export function initials(sname: string, pinyin: string): string {
  if (sname) return sname.slice(-1);
  const parts = pinyin.trim().split(/\s+/);
  return parts.length ? parts[parts.length - 1].slice(0, 1).toUpperCase() : "?";
}

export function placeholderSvg(name: string, color: string): string {
  const hex = /^[0-9a-fA-F]{6}$/.test(color) ? color : "8ed2f5";
  const label = (name || "?").slice(0, 2);
  const c1 = `#${hex}`;
  const c2 = shade(hex, -25);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#g)"/>
  <text x="200" y="230" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="140" font-weight="700" fill="rgba(255,255,255,0.92)" text-anchor="middle">${escapeXml(label)}</text>
</svg>`;
}

function shade(hex: string, percent: number): string {
  const num = parseInt(hex, 16);
  let r = (num >> 16) + Math.round((percent / 100) * 255);
  let g = ((num >> 8) & 0x00ff) + Math.round((percent / 100) * 255);
  let b = (num & 0x0000ff) + Math.round((percent / 100) * 255);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      default:
        return "&quot;";
    }
  });
}
