// 旧版占位 Token：若部署环境注入了全局 GITHUB_TOKEN 则使用之，否则回退占位值。
// （改为 module worker 后 secrets 走 env 绑定，这里检查 globalThis 避免自引用 TDZ。）
const GITHUB_TOKEN =
  "Bearer " +
  (typeof globalThis.GITHUB_TOKEN !== "undefined"
    ? globalThis.GITHUB_TOKEN
    : "你的Token");
const REPO_OWNER = "Tangyixiao";
const REPO_NAME = "Tangyixiao.github.io";
const NOTES_PATH = "notes.json";
const BRANCH = "main";

// 生成简短ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

async function getNotesFile() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${NOTES_PATH}`;
  const res = await fetch(url, { headers: { Authorization: GITHUB_TOKEN } });
  if (res.status === 404) return { content: [], sha: null };
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = await res.json();
  const content = JSON.parse(atob(data.content));
  return { content, sha: data.sha };
}

async function saveNotesFile(notes, sha, message) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${NOTES_PATH}`;
  const content = btoa(
    unescape(encodeURIComponent(JSON.stringify(notes, null, 2))),
  );
  const body = { message, content, branch: BRANCH };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: GITHUB_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub write error: ${res.status}`);
  return res.json();
}

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS 头
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (method === "OPTIONS") return new Response(null, { status: 204, headers });

  try {
    // 获取现有笔记
    let { content: notes, sha } = await getNotesFile();

    // 路由处理
    if (path === "/api/notes" && method === "GET") {
      return new Response(JSON.stringify(notes), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    if (path === "/api/notes" && method === "POST") {
      const body = await request.json();
      const newNote = {
        id: generateId(),
        title: body.title,
        content: body.content,
        isPublic: body.isPublic || false,
        author: body.author,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      notes.push(newNote);
      await saveNotesFile(notes, sha, `Add note: ${newNote.title}`);
      return new Response(JSON.stringify(newNote), {
        status: 201,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // 带ID的操作
    const idMatch = path.match(/^\/api\/notes\/(.+)$/);
    if (idMatch) {
      const noteId = idMatch[1];
      const noteIndex = notes.findIndex((n) => n.id === noteId);
      if (noteIndex === -1) {
        return new Response(JSON.stringify({ error: "Note not found" }), {
          status: 404,
          headers,
        });
      }

      if (method === "PUT") {
        const body = await request.json();
        // 权限校验（实际应由前端传递用户名，此处简化：只检查作者是否匹配）
        const note = notes[noteIndex];
        if (body.author && note.author !== body.author) {
          return new Response(JSON.stringify({ error: "Permission denied" }), {
            status: 403,
            headers,
          });
        }
        notes[noteIndex] = {
          ...note,
          title: body.title || note.title,
          content: body.content || note.content,
          isPublic: body.isPublic !== undefined ? body.isPublic : note.isPublic,
          updatedAt: new Date().toISOString(),
        };
        await saveNotesFile(notes, sha, `Update note: ${noteId}`);
        return new Response(JSON.stringify(notes[noteIndex]), { headers });
      }

      if (method === "DELETE") {
        // 同样应校验权限
        const note = notes[noteIndex];
        // 这里前端传递author? 实际应通过请求头或body，我们简化：从查询参数获取当前用户
        const reqUser = url.searchParams.get("user");
        if (reqUser && note.author !== reqUser) {
          return new Response(JSON.stringify({ error: "Permission denied" }), {
            status: 403,
            headers,
          });
        }
        notes.splice(noteIndex, 1);
        await saveNotesFile(notes, sha, `Delete note: ${noteId}`);
        return new Response(null, { status: 204, headers });
      }
    }

    return new Response("Not found", { status: 404, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers,
    });
  }
}

// ---------------------------------------------------------------------------
// v2.2「问我的笔记」：POST /api/ask —— 代理智谱 GLM 的站点问答。
// API Key 通过 wrangler secret 注入（wrangler secret put ZHIPU_API_KEY），
// 绝不写入仓库；站点知识作为 system prompt 内嵌在下方常量里。
// ---------------------------------------------------------------------------

const GLM_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const GLM_MODEL = "glm-4-flash";
const ASK_MAX_LENGTH = 500;
const ASK_RATE_INTERVAL_MS = 10_000;

// 站点知识（从仓库真实内容提炼，<200 字）：只允许依据这些内容回答。
const SITE_KNOWLEDGE = `你是唐一潇个人网站的问答助手。站点内容：项目 CodeHub（算法竞赛题解与模板库）、HighSchoolMathematics（高中数学公式推导知识库）、Agent Learning Hub（AI Agent 与大模型学习笔记）；太阳系探索器（Three.js 驱动、行星轨道与尺寸保持真实比例的交互太阳系）；实验场（独立运行的 WebGL 小实验合集）；博客文章《从一道题，到一份可复用的题解》《把推导写清楚，把理解留住》《用一个小实验，理解智能体》。只依据以上内容用中文简洁作答；没有依据的内容直接说明不知道。`;

// CORS 只放行正式站点与本地测试端口（其余来源不下发 Allow-Origin）。
const ASK_ALLOWED_ORIGIN = /^(https:\/\/tangyixiao\.github\.io|http:\/\/127\.0\.0\.1:\d+)$/;

// 简易限流：同一 IP 每 10 秒最多 1 次。Worker 内存 Map 只存在于单个隔离实例，
// 多实例部署下只是尽力而为，不保证全局精确。
const askRateLimiter = new Map();

function askResponse(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// 供 fetch handler 与 Node 单测共同调用的纯函数。
export async function handleAsk(request, env) {
  const origin = request.headers.get("Origin");
  const corsHeaders = { "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
  if (origin && ASK_ALLOWED_ORIGIN.test(origin)) {
    corsHeaders["Access-Control-Allow-Origin"] = origin;
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return askResponse({ error: "method_not_allowed" }, 405, corsHeaders);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  if (now - (askRateLimiter.get(ip) || 0) < ASK_RATE_INTERVAL_MS) {
    return askResponse({ error: "rate_limited" }, 429, corsHeaders);
  }
  askRateLimiter.set(ip, now);

  if (!env || !env.ZHIPU_API_KEY) {
    return askResponse({ error: "not_configured" }, 503, corsHeaders);
  }

  let question = "";
  try {
    const body = await request.json();
    if (typeof body.question === "string") question = body.question.trim();
  } catch {
    question = "";
  }
  if (!question) return askResponse({ error: "invalid_question" }, 400, corsHeaders);
  if (question.length > ASK_MAX_LENGTH) {
    return askResponse({ error: "question_too_long" }, 400, corsHeaders);
  }

  try {
    const upstream = await fetch(GLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.ZHIPU_API_KEY}`,
      },
      body: JSON.stringify({
        model: GLM_MODEL,
        messages: [
          { role: "system", content: SITE_KNOWLEDGE },
          { role: "user", content: question },
        ],
        temperature: 0.5,
        max_tokens: 400,
      }),
    });
    if (!upstream.ok) {
      return askResponse({ error: "upstream_error" }, 502, corsHeaders);
    }
    const data = await upstream.json();
    const content = data?.choices?.[0]?.message?.content;
    const answer = typeof content === "string" ? content.trim() : "";
    if (!answer) return askResponse({ error: "upstream_error" }, 502, corsHeaders);
    return askResponse({ answer, model: GLM_MODEL }, 200, corsHeaders);
  } catch {
    return askResponse({ error: "upstream_error" }, 502, corsHeaders);
  }
}

// Worker 入口：改为 ES Module 格式（module worker）以便读取 env 绑定
// （ZHIPU_API_KEY）并支持单测导入；notes 既有路由的行为保持不变。
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/ask") return handleAsk(request, env);
    return handleRequest(request);
  },
};
