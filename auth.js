// auth.js —— 处理登录、注册，支持模拟模式与 GitHub API 真实存储
const Auth = (function () {
  // ========== 配置区域 ==========
  // 若需真实写入 GitHub 仓库，请填写以下信息并设置 ENABLE_GITHUB_STORAGE = true
  const ENABLE_GITHUB_STORAGE = false; // 改为 true 启用真实存储
  const GITHUB_TOKEN = "your_personal_access_token"; // 需要 repo 权限
  const REPO_OWNER = "Tangyixiao";
  const REPO_NAME = "Tangyixiao.github.io"; // 或存放 users.json 的仓库
  const USERS_FILE_PATH = "users.json"; // 存储用户数据的文件路径
  const BRANCH = "main";

  // 模拟用户数据库（当 ENABLE_GITHUB_STORAGE = false 时使用）
  let mockUsers = [];

  // 初始化：从 localStorage 加载模拟数据
  function loadMockUsers() {
    const stored = localStorage.getItem("tangyixiao_mock_users");
    if (stored) {
      mockUsers = JSON.parse(stored);
    } else {
      // 默认内置一个测试账号
      mockUsers = [
        {
          username: "demo",
          email: "demo@example.com",
          passwordHash: sha256("123456"), // 简单哈希，实际应加盐
        },
      ];
      saveMockUsers();
    }
  }
  function saveMockUsers() {
    localStorage.setItem("tangyixiao_mock_users", JSON.stringify(mockUsers));
  }

  // 简单的 SHA-256 哈希（使用 Web Crypto API）
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // ========== GitHub API 操作 ==========
  async function getFileContent(path) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
    const response = await fetch(url, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` },
    });
    if (!response.ok) {
      if (response.status === 404) return null; // 文件不存在
      throw new Error(`获取文件失败: ${response.status}`);
    }
    const data = await response.json();
    const content = atob(data.content);
    return { content, sha: data.sha };
  }

  async function updateFile(path, content, sha, commitMessage) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
    const body = {
      message: commitMessage,
      content: btoa(unescape(encodeURIComponent(content))), // 支持中文
      branch: BRANCH,
    };
    if (sha) body.sha = sha;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`更新文件失败: ${response.status}`);
    return await response.json();
  }

  // 从 GitHub 加载用户列表
  async function loadUsersFromGitHub() {
    try {
      const file = await getFileContent(USERS_FILE_PATH);
      if (!file) {
        // 文件不存在，创建一个空数组
        return [];
      }
      return JSON.parse(file.content);
    } catch (e) {
      console.error("加载用户数据失败，回退模拟数据", e);
      return null;
    }
  }

  // 保存用户列表到 GitHub
  async function saveUsersToGitHub(users) {
    try {
      const file = await getFileContent(USERS_FILE_PATH);
      const content = JSON.stringify(users, null, 2);
      const sha = file ? file.sha : null;
      await updateFile(USERS_FILE_PATH, content, sha, "更新用户数据");
      return true;
    } catch (e) {
      console.error("保存到 GitHub 失败", e);
      return false;
    }
  }

  // ========== 公开方法 ==========
  async function register(username, email, password) {
    const passwordHash = await sha256(password);

    if (ENABLE_GITHUB_STORAGE) {
      try {
        let users = await loadUsersFromGitHub();
        if (users === null) throw new Error("无法加载用户数据");

        // 检查用户名/邮箱是否已存在
        if (users.find((u) => u.username === username || u.email === email)) {
          return { success: false, message: "用户名或邮箱已被注册" };
        }

        users.push({ username, email, passwordHash });
        const saved = await saveUsersToGitHub(users);
        if (!saved) throw new Error("写入失败");
        return { success: true };
      } catch (e) {
        return { success: false, message: e.message };
      }
    } else {
      // 模拟模式
      loadMockUsers();
      if (mockUsers.find((u) => u.username === username || u.email === email)) {
        return { success: false, message: "用户名或邮箱已被注册" };
      }
      mockUsers.push({ username, email, passwordHash });
      saveMockUsers();
      return { success: true };
    }
  }

  async function login(identifier, password) {
    const passwordHash = await sha256(password);
    let users = [];

    if (ENABLE_GITHUB_STORAGE) {
      try {
        users = await loadUsersFromGitHub();
        if (!users) throw new Error("无法连接用户数据库");
      } catch (e) {
        return { success: false, message: e.message };
      }
    } else {
      loadMockUsers();
      users = mockUsers;
    }

    const user = users.find(
      (u) =>
        (u.username === identifier || u.email === identifier) &&
        u.passwordHash === passwordHash,
    );

    if (user) {
      // 不返回密码哈希
      const { passwordHash, ...safeUser } = user;
      return { success: true, user: safeUser };
    } else {
      return { success: false, message: "用户名/邮箱或密码错误" };
    }
  }

  function logout() {
    localStorage.removeItem("tangyixiao_user");
  }

  function getCurrentUser() {
    const userStr = localStorage.getItem("tangyixiao_user");
    return userStr ? JSON.parse(userStr) : null;
  }

  return { register, login, logout, getCurrentUser };
})();
