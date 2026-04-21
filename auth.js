// ================================================
//  Tangyixiao 认证模块 · 前端
//  功能：用户注册、登录、状态管理
//  后端 API：Cloudflare Worker (URL 需配置)
// ================================================

// --- 配置后端 Worker 地址 (请确认与您的 Worker URL 一致) ---
const WORKER_URL = "https://tangyixiao-api-gihub-io.37662981.workers.dev";

// --- 工具函数：SHA-256 哈希 (用于密码加密) ---
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// --- 认证核心对象 ---
const Auth = (function () {
  // 获取当前登录用户 (从 localStorage 读取)
  function getCurrentUser() {
    const userStr = localStorage.getItem("tangyixiao_user");
    return userStr ? JSON.parse(userStr) : null;
  }

  // 保存用户信息到 localStorage
  function setCurrentUser(user) {
    localStorage.setItem("tangyixiao_user", JSON.stringify(user));
  }

  // 退出登录
  function logout() {
    localStorage.removeItem("tangyixiao_user");
    // 可选：触发页面刷新或状态更新
    window.dispatchEvent(new Event("auth-change"));
  }

  // 注册
  async function register(username, email, password) {
    const passwordHash = await sha256(password);
    try {
      const response = await fetch(`${WORKER_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, passwordHash }),
      });
      const result = await response.json();
      if (!response.ok) {
        return { success: false, message: result.message || "注册失败" };
      }
      return result;
    } catch (e) {
      console.error("注册请求错误:", e);
      return { success: false, message: "网络错误，请稍后重试" };
    }
  }

  // 登录
  async function login(identifier, password) {
    const passwordHash = await sha256(password);
    try {
      const response = await fetch(`${WORKER_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, passwordHash }),
      });
      const result = await response.json();
      if (result.success) {
        setCurrentUser(result.user);
        window.dispatchEvent(new Event("auth-change"));
      }
      return result;
    } catch (e) {
      console.error("登录请求错误:", e);
      return { success: false, message: "网络错误，请稍后重试" };
    }
  }

  // 公开 API
  return {
    register,
    login,
    logout,
    getCurrentUser,
  };
})();
