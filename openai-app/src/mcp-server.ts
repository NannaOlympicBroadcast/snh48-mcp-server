import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  searchMembers,
  normalizeGroup,
  normalizeTeam,
  memberExperienceText,
} from "./lib/members.js";
import { getUpcomingShows } from "./lib/shows.js";
import { photoUrl, placeholderDataUri } from "./lib/photo.js";
import { buildMembersWidgetHtml } from "./widgets/members.js";
import { buildShowsWidgetHtml } from "./widgets/shows.js";

const RESOURCE_MIME_TYPE = "text/html;profile=mcp-app";

const MEMBERS_WIDGET_URI = "ui://widget/members.html";
const SHOWS_WIDGET_URI = "ui://widget/shows.html";

/** 构建一个绑定到指定部署域名的 MCP Server 实例（每次请求新建，成本很低）。 */
export function buildServer(baseUrl: string): McpServer {
  const server = new McpServer(
    { name: "snh48-mcp-server", version: "1.0.0" },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
      instructions:
        "查询 SNH48/GNZ48/BEJ48/CKG48/CGT48 在籍成员资料与近期公演票务信息，结果均以可视化卡片展示（含成员照片）。",
    }
  );

  const csp = {
    connectDomains: [] as string[],
    resourceDomains: [baseUrl, "https://www.snh48.com"],
  };

  // ---- 成员照片 widget ----
  server.registerResource(
    "members-widget",
    MEMBERS_WIDGET_URI,
    {
      title: "SNH48 成员卡片",
      mimeType: RESOURCE_MIME_TYPE,
    },
    async () => ({
      contents: [
        {
          uri: MEMBERS_WIDGET_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: buildMembersWidgetHtml(),
          _meta: {
            ui: {
              prefersBorder: true,
              domain: baseUrl,
              csp,
            },
          },
        },
      ],
    })
  );

  // ---- 公演/票务 widget ----
  server.registerResource(
    "shows-widget",
    SHOWS_WIDGET_URI,
    {
      title: "SNH48 公演日程",
      mimeType: RESOURCE_MIME_TYPE,
    },
    async () => ({
      contents: [
        {
          uri: SHOWS_WIDGET_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: buildShowsWidgetHtml(),
          _meta: {
            ui: {
              prefersBorder: true,
              domain: baseUrl,
              csp,
            },
          },
        },
      ],
    })
  );

  // ---- search_members 工具 ----
  server.registerTool(
    "search_members",
    {
      title: "查询 SNH48 系成员",
      description:
        "按姓名/昵称/团体/队伍/期数/籍贯等条件查询 SNH48、GNZ48、BEJ48、CKG48、CGT48 在籍成员资料，" +
        "以带照片的卡片形式展示。若只匹配到一位成员，会自动展示该成员的详细资料卡（含照片、简介、特长、加入日期等）。",
      inputSchema: {
        keyword: z
          .string()
          .optional()
          .describe("按姓名 / 拼音 / 昵称 / 姓名缩写模糊搜索，如 “段艺璇” 或 “Duan”"),
        group: z
          .string()
          .optional()
          .describe("团体：SNH48 / GNZ48 / BEJ48 / CKG48 / CGT48"),
        team: z.string().optional().describe("队伍：SII / NII / HII / X"),
        generation: z.string().optional().describe("期数关键词，如 “五期生”"),
        birthplace: z.string().optional().describe("籍贯关键词，如 “四川”"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(48)
          .optional()
          .describe("返回结果数量上限，默认 24，最大 48"),
      },
      outputSchema: {
        query: z.string(),
        total: z.number(),
        members: z.array(z.record(z.any())),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
      _meta: {
        ui: { resourceUri: MEMBERS_WIDGET_URI },
        "openai/outputTemplate": MEMBERS_WIDGET_URI,
        "openai/toolInvocation/invoking": "正在查询成员资料…",
        "openai/toolInvocation/invoked": "查询完成",
      },
    },
    async (args) => {
      const { members, total } = await searchMembers(args);
      const enriched = members.map((m) => {
        const color = m.tcolor || m.gcolor || "8ed2f5";
        return {
          ...m,
          experience: memberExperienceText(m),
          photo_url: photoUrl(baseUrl, m.sid, m.sname, color),
          fallback_photo_url: placeholderDataUri(m.sname, color),
        };
      });

      const queryDesc =
        [
          args.keyword && `关键词="${args.keyword}"`,
          args.group && `团体=${normalizeGroup(args.group)}`,
          args.team && `队伍=${normalizeTeam(args.team)}`,
          args.generation && `期数含"${args.generation}"`,
          args.birthplace && `籍贯含"${args.birthplace}"`,
        ]
          .filter(Boolean)
          .join(" ") || "全部在籍成员";

      const structuredContent = { query: queryDesc, total, members: enriched };

      const summary =
        total === 0
          ? `未找到符合条件（${queryDesc}）的成员。`
          : `找到 ${total} 位符合条件（${queryDesc}）的成员${total > enriched.length ? `，已展示前 ${enriched.length} 位` : ""}。`;

      return {
        structuredContent,
        content: [{ type: "text", text: summary }],
      };
    }
  );

  // ---- get_upcoming_shows 工具 ----
  server.registerTool(
    "get_upcoming_shows",
    {
      title: "查询近期公演与票务",
      description:
        "获取 SNH48 系团体未来若干天内的剧场公演场次及票务状态（VIP票/普通票有售、售罄），" +
        "以按日期分组的时间线卡片展示，并附购票链接。",
      inputSchema: {
        group: z
          .string()
          .optional()
          .describe("团体：SNH48（默认）/ BEJ48 / GNZ48 / CKG48 / CGT48"),
        days: z
          .number()
          .int()
          .min(1)
          .max(30)
          .optional()
          .describe("查询未来几天内的公演，默认 7 天，最大 30 天"),
      },
      outputSchema: {
        group: z.string(),
        days: z.number(),
        shows: z.array(z.record(z.any())),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
      _meta: {
        ui: { resourceUri: SHOWS_WIDGET_URI },
        "openai/outputTemplate": SHOWS_WIDGET_URI,
        "openai/toolInvocation/invoking": "正在查询公演与票务信息…",
        "openai/toolInvocation/invoked": "查询完成",
      },
    },
    async (args) => {
      const days = args.days ?? 7;
      const groupInput = args.group ?? "SNH48";
      const shows = await getUpcomingShows(groupInput, days);
      const groupLabel = normalizeGroup(groupInput)
        ? `${normalizeGroup(groupInput)}48`
        : groupInput;

      const structuredContent = { group: groupLabel, days, shows };
      const summary = shows.length
        ? `${groupLabel} 未来 ${days} 天内共有 ${shows.length} 场公演。`
        : `${groupLabel} 未来 ${days} 天内暂无公演安排。`;

      return {
        structuredContent,
        content: [{ type: "text", text: summary }],
      };
    }
  );

  return server;
}
