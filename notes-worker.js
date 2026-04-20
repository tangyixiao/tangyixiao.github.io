const GITHUB_TOKEN =
  "Bearer " +
  (typeof GITHUB_TOKEN !== "undefined" ? GITHUB_TOKEN : "你的Token");
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

addEventListener("fetch", (event) =>
  event.respondWith(handleRequest(event.request)),
);
