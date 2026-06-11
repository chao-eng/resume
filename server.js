const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const ROOT_DIR = __dirname;
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT_DIR, "data"));
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DB_PATH = path.resolve(process.env.DATABASE_PATH || path.join(DATA_DIR, "resume.sqlite"));
const SQLITE_BIN = process.env.SQLITE_BIN || "sqlite3";
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".jsx": "text/babel; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};

function ensureRuntimeDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function runSql(sql) {
  return execFileSync(SQLITE_BIN, [DB_PATH, sql], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
}

function queryJson(sql) {
  const output = execFileSync(SQLITE_BIN, ["-json", DB_PATH, sql], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return JSON.parse(output || "[]");
}

function tableExists(tableName) {
  const rows = queryJson(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = ${sqlString(tableName)}
    LIMIT 1;
  `);
  return rows.length > 0;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizePersonalInfo(value = {}) {
  return {
    name: value.name || "未命名用户",
    age: Number(value.age || 0),
    experienceYears: Number(value.experienceYears || 0),
    education: value.education || "",
    status: value.status || "",
    contact: {
      phone: value.contact?.phone || "",
      email: value.contact?.email || "",
    },
  };
}

function normalizeResumeData(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const version = source.versions
    ? (source.versions.optimized || source.versions.standard || Object.values(source.versions)[0] || {})
    : source;

  return {
    personalInfo: normalizePersonalInfo(source.personalInfo),
    title: version.title || source.title || "",
    advantages: asArray(version.advantages || source.advantages),
    skills: asArray(version.skills || source.skills).map(group => ({
      category: group?.category || "",
      items: asArray(group?.items),
    })),
    experience: asArray(version.experience || source.experience).map(exp => ({
      company: exp?.company || "",
      role: exp?.role || "",
      period: exp?.period || "",
      projects: asArray(exp?.projects).map(project => ({
        name: project?.name || "",
        period: project?.period || "",
        points: asArray(project?.points),
      })),
    })),
  };
}

function emptyResumeData() {
  return {
    personalInfo: normalizePersonalInfo({
      name: "未命名用户",
      age: 26,
      experienceYears: 3,
      education: "硕士 / 某某大学 (2020 - 2023)\n本科 / 某某学院 (2016 - 2020)",
      status: "离职-随时到岗",
      contact: {
        phone: "13800000000",
        email: "weimingming@example.com",
      },
    }),
    title: "全栈开发工程师",
    advantages: [
      "具备扎实的 JavaScript / TypeScript 开发功底，熟练掌握 React 与 Node.js 技术栈。",
      "熟悉 RESTful API 设计与关系型数据库建模，具有优秀的代码编写规范和架构思维。",
      "拥有良好的自主学习与问题分析解决能力，乐于沟通协作并能快速融入团队。"
    ],
    skills: [
      {
        category: "前端开发",
        items: ["React", "Vue", "TypeScript", "Webpack / Vite", "Tailwind CSS"]
      },
      {
        category: "后端开发",
        items: ["Node.js", "Express / NestJS", "MySQL / SQLite", "RESTful API"]
      },
      {
        category: "其它技能",
        items: ["Docker", "Git", "Linux / Shell"]
      }
    ],
    experience: [
      {
        company: "某某互联网公司",
        role: "核心研发工程师",
        period: "2023.07 - 至今",
        projects: [
          {
            name: "高并发简历在线服务",
            period: "2024.01 - 2024.06",
            points: [
              "使用 React + Node.js 研发了简历生成与管理平台，系统加载速度提升 40%。",
              "设计并搭建了基于 SQLite 的多用户数据存储结构，完成了稳定、安全的持久化支持。",
              "针对 PDF 打印渲染进行了排版调参优化，支持在不同设计哲学下的 A4 完美输出。"
            ]
          }
        ]
      }
    ]
  };
}

function readSeedData() {
  const seedPath = path.join(ROOT_DIR, "resume_data.json");
  if (!fs.existsSync(seedPath)) {
    return emptyResumeData();
  }
  return normalizeResumeData(JSON.parse(fs.readFileSync(seedPath, "utf8")));
}

function initDatabase() {
  ensureRuntimeDirs();
  runSql(`
    CREATE TABLE IF NOT EXISTS resume_users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      payload TEXT NOT NULL,
      avatar_path TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const count = Number(runSql("SELECT COUNT(*) FROM resume_users;").trim());
  if (count === 0) {
    let seed = null;
    let avatarPath = null;

    if (tableExists("resume_profile")) {
      const oldRows = queryJson(`
        SELECT payload, avatar_path AS avatarPath
        FROM resume_profile
        WHERE id = 1
        LIMIT 1;
      `);
      if (oldRows.length) {
        seed = normalizeResumeData(JSON.parse(oldRows[0].payload));
        avatarPath = oldRows[0].avatarPath || null;
      }
    }

    seed = seed || readSeedData();

    runSql(`
      INSERT INTO resume_users (id, display_name, payload, avatar_path, created_at, updated_at)
      VALUES (
        'default',
        ${sqlString(seed.personalInfo.name || "默认用户")},
        ${sqlString(JSON.stringify(seed, null, 2))},
        ${avatarPath ? sqlString(avatarPath) : "NULL"},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      );
    `);
  }

  migrateUserPayloads();
}

function migrateUserPayloads() {
  const rows = queryJson("SELECT id, payload FROM resume_users;");
  for (const row of rows) {
    const original = JSON.parse(row.payload);
    if (!original.versions) {
      continue;
    }
    const normalized = normalizeResumeData(original);
    runSql(`
      UPDATE resume_users
      SET payload = ${sqlString(JSON.stringify(normalized, null, 2))},
          display_name = ${sqlString(normalized.personalInfo.name || "未命名用户")}
      WHERE id = ${sqlString(row.id)};
    `);
  }
}

function avatarUrlFor(avatarPath) {
  return avatarPath ? `/uploads/${encodeURIComponent(avatarPath)}` : "";
}

function getDefaultUserId() {
  const rows = queryJson(`
    SELECT id
    FROM resume_users
    ORDER BY CASE WHEN id = 'default' THEN 0 ELSE 1 END, created_at ASC
    LIMIT 1;
  `);
  if (!rows.length) {
    throw new Error("No resume users found.");
  }
  return rows[0].id;
}

function resolveUserId(value) {
  return value || getDefaultUserId();
}

function getUsers() {
  const rows = queryJson(`
    SELECT id, display_name AS displayName, avatar_path AS avatarPath, updated_at AS updatedAt
    FROM resume_users
    ORDER BY CASE WHEN id = 'default' THEN 0 ELSE 1 END, created_at ASC;
  `);

  return rows.map(row => ({
    id: row.id,
    displayName: row.displayName,
    avatarUrl: avatarUrlFor(row.avatarPath),
    updatedAt: row.updatedAt,
  }));
}

function getProfile(userId) {
  const id = resolveUserId(userId);
  const rows = queryJson(`
    SELECT id, display_name AS displayName, payload, avatar_path AS avatarPath, updated_at AS updatedAt
    FROM resume_users
    WHERE id = ${sqlString(id)}
    LIMIT 1;
  `);

  if (!rows.length) {
    const err = new Error("User not found.");
    err.status = 404;
    throw err;
  }

  const row = rows[0];
  return {
    user: {
      id: row.id,
      displayName: row.displayName,
      avatarUrl: avatarUrlFor(row.avatarPath),
      updatedAt: row.updatedAt,
    },
    data: normalizeResumeData(JSON.parse(row.payload)),
    avatarUrl: avatarUrlFor(row.avatarPath),
    updatedAt: row.updatedAt,
  };
}

function saveProfile(userId, data) {
  const normalized = normalizeResumeData(data);
  validateResumeData(normalized);

  const id = resolveUserId(userId);
  const payload = JSON.stringify(normalized, null, 2);
  const displayName = normalized.personalInfo.name || "未命名用户";
  runSql(`
    UPDATE resume_users
    SET payload = ${sqlString(payload)},
        display_name = ${sqlString(displayName)},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${sqlString(id)};
  `);

  return getProfile(id);
}

function createUser(name, sourceUserId) {
  const id = `user-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const displayName = String(name || "").trim() || "未命名用户";
  const data = emptyResumeData();
  data.personalInfo.name = displayName;

  runSql(`
    INSERT INTO resume_users (id, display_name, payload, avatar_path, created_at, updated_at)
    VALUES (
      ${sqlString(id)},
      ${sqlString(displayName)},
      ${sqlString(JSON.stringify(data, null, 2))},
      NULL,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  `);

  return getProfile(id);
}

function saveAvatar(userId, file) {
  const id = resolveUserId(userId);
  getProfile(id);

  const extByMime = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };
  const ext = extByMime[file.contentType] || path.extname(file.filename).toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) {
    const err = new Error("Only PNG, JPG, WebP, and GIF images are supported.");
    err.status = 415;
    throw err;
  }
  if (file.content.length > MAX_IMAGE_BYTES) {
    const err = new Error("Image is too large.");
    err.status = 413;
    throw err;
  }

  const safeExt = ext === ".jpeg" ? ".jpg" : ext;
  const filename = `avatar-${id}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}${safeExt}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.content);

  runSql(`
    UPDATE resume_users
    SET avatar_path = ${sqlString(filename)}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${sqlString(id)};
  `);

  const profile = getProfile(id);
  return {
    user: profile.user,
    avatarUrl: profile.avatarUrl,
    updatedAt: profile.updatedAt,
  };
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendJsonDownload(res, filename, value) {
  const body = JSON.stringify(value, null, 2);
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendError(res, error) {
  const status = error.status || 500;
  sendJson(res, status, {
    error: error.message || "Internal server error",
  });
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        const err = new Error("Request body is too large.");
        err.status = 413;
        req.destroy(err);
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function splitBuffer(buffer, separator) {
  const parts = [];
  let start = 0;
  let index = buffer.indexOf(separator, start);

  while (index !== -1) {
    parts.push(buffer.subarray(start, index));
    start = index + separator.length;
    index = buffer.indexOf(separator, start);
  }

  parts.push(buffer.subarray(start));
  return parts;
}

function parseMultipart(buffer, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  if (!match) {
    const err = new Error("Missing multipart boundary.");
    err.status = 400;
    throw err;
  }

  const boundary = Buffer.from(`--${match[1] || match[2]}`);
  const parts = splitBuffer(buffer, boundary);

  for (const rawPart of parts) {
    let part = rawPart;
    if (part.length === 0 || part.equals(Buffer.from("--\r\n")) || part.equals(Buffer.from("--"))) {
      continue;
    }
    if (part.subarray(0, 2).toString() === "\r\n") {
      part = part.subarray(2);
    }
    if (part.subarray(part.length - 2).toString() === "\r\n") {
      part = part.subarray(0, part.length - 2);
    }
    if (part.subarray(part.length - 2).toString() === "--") {
      part = part.subarray(0, part.length - 2);
    }

    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd === -1) {
      continue;
    }

    const headerText = part.subarray(0, headerEnd).toString("utf8");
    const content = part.subarray(headerEnd + 4);
    const disposition = /content-disposition:\s*form-data;([^\r\n]+)/i.exec(headerText);
    if (!disposition) {
      continue;
    }

    const name = /name="([^"]+)"/i.exec(disposition[1])?.[1];
    const filename = /filename="([^"]*)"/i.exec(disposition[1])?.[1];
    const contentTypeMatch = /content-type:\s*([^\r\n]+)/i.exec(headerText);

    if (name === "avatar" && filename) {
      return {
        filename,
        contentType: (contentTypeMatch?.[1] || "application/octet-stream").trim().toLowerCase(),
        content,
      };
    }
  }

  const err = new Error("Avatar file field is missing.");
  err.status = 400;
  throw err;
}

function validateResumeData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw Object.assign(new Error("Resume data must be an object."), { status: 400 });
  }
  if (!data.personalInfo) {
    throw Object.assign(new Error("Resume data is missing personalInfo."), { status: 400 });
  }
  if (!Array.isArray(data.advantages) || !Array.isArray(data.skills) || !Array.isArray(data.experience)) {
    throw Object.assign(new Error("Resume data must include advantages, skills, and experience arrays."), { status: 400 });
  }
}

async function parseJsonBody(req, maxBytes = MAX_JSON_BYTES) {
  const body = await readBody(req, maxBytes);
  return JSON.parse(body.toString("utf8") || "{}");
}

async function handleApi(req, res, url) {
  const pathname = url.pathname;
  const userId = url.searchParams.get("userId");

  if (pathname === "/api/users" && req.method === "GET") {
    sendJson(res, 200, {
      users: getUsers(),
      activeUserId: resolveUserId(userId),
    });
    return true;
  }

  if (pathname === "/api/users" && req.method === "POST") {
    const parsed = await parseJsonBody(req);
    const profile = createUser(parsed.name, parsed.sourceUserId);
    sendJson(res, 201, {
      users: getUsers(),
      profile,
    });
    return true;
  }

  if (pathname === "/api/resume" && req.method === "GET") {
    sendJson(res, 200, getProfile(userId));
    return true;
  }

  if ((pathname === "/api/resume.json" || pathname === "/api/resume/export") && req.method === "GET") {
    const profile = getProfile(userId);
    sendJsonDownload(res, `${profile.user.id}.resume.json`, profile.data);
    return true;
  }

  if (pathname === "/api/resume" && (req.method === "PUT" || req.method === "POST")) {
    const parsed = await parseJsonBody(req);
    const data = parsed.data || parsed;
    sendJson(res, 200, saveProfile(userId, data));
    return true;
  }

  if (pathname === "/api/avatar" && req.method === "POST") {
    const body = await readBody(req, MAX_IMAGE_BYTES + 1024 * 128);
    const file = parseMultipart(body, req.headers["content-type"]);
    sendJson(res, 200, saveAvatar(userId, file));
    return true;
  }

  return false;
}

function isAuthorized(req) {
  const password = process.env.ACCESS_PASSWORD;
  if (!password) {
    return true;
  }
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/(?:^|; )auth_password=([^;]*)/);
  if (!match) {
    return false;
  }
  try {
    return decodeURIComponent(match[1]) === password;
  } catch (e) {
    return false;
  }
}

function serveLoginPage(res) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>访问受限 | 简历生成器</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow: hidden;
    }
    .glow {
      position: absolute;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%);
      border-radius: 50%;
      z-index: 0;
      pointer-events: none;
    }
    .glow-1 { top: -100px; left: -100px; }
    .glow-2 { bottom: -100px; right: -100px; }

    .login-container {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 400px;
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 40px 32px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      text-align: center;
      transform: translateY(20px);
      opacity: 0;
      animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes fadeInUp {
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .logo {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
      background: linear-gradient(to right, #818cf8, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.02em;
    }

    .title {
      font-size: 15px;
      color: #94a3b8;
      margin-bottom: 32px;
      font-weight: 300;
    }

    .form-group {
      margin-bottom: 20px;
      text-align: left;
      position: relative;
    }

    .label {
      display: block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .input-wrapper {
      position: relative;
    }

    .input {
      width: 100%;
      height: 48px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 0 16px;
      color: #fff;
      font-size: 15px;
      outline: none;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
      background: rgba(15, 23, 42, 0.8);
    }

    .button {
      width: 100%;
      height: 48px;
      background: #6366f1;
      border: none;
      border-radius: 12px;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s ease;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .button:hover {
      background: #4f46e5;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
    }

    .button:active {
      transform: translateY(0);
    }

    .button:disabled {
      background: rgba(99, 102, 241, 0.5);
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .error-msg {
      font-size: 13px;
      color: #f87171;
      margin-top: 12px;
      min-height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .error-msg.visible {
      opacity: 1;
      animation: shake 0.4s ease;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 0.8s linear infinite;
      display: none;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .button.loading .spinner {
      display: inline-block;
    }
    .button.loading .btn-text {
      display: none;
    }
  </style>
</head>
<body>
  <div class="glow glow-1"></div>
  <div class="glow glow-2"></div>

  <div class="login-container">
    <div class="logo">RESUME</div>
    <div class="title">请输入密码以继续访问简历生成器</div>

    <form id="login-form">
      <div class="form-group">
        <label class="label" for="password">访问密码</label>
        <div class="input-wrapper">
          <input class="input" type="password" id="password" autocomplete="current-password" placeholder="••••••••" required>
        </div>
      </div>

      <button class="button" type="submit" id="submit-btn">
        <span class="spinner"></span>
        <span class="btn-text">登录</span>
      </button>

      <div class="error-msg" id="error-box"></div>
    </form>
  </div>

  <script>
    const form = document.getElementById('login-form');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submit-btn');
    const errorBox = document.getElementById('error-box');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const password = passwordInput.value;
      if (!password) return;

      errorBox.classList.remove('visible');
      errorBox.textContent = '';
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });

        const data = await response.json();
        
        if (response.ok) {
          window.location.reload();
        } else {
          errorBox.textContent = data.error || '密码错误';
          errorBox.classList.add('visible');
          passwordInput.focus();
        }
      } catch (err) {
        errorBox.textContent = '网络错误，请稍后再试';
        errorBox.classList.add('visible');
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    });
  </script>
</body>
</html>`;
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(html),
  });
  res.end(html);
}

function serveUploads(res, pathname) {
  const filename = path.basename(decodeURIComponent(pathname.replace(/^\/uploads\//, "")));
  const filePath = path.resolve(UPLOAD_DIR, filename);
  if (!filePath.startsWith(`${UPLOAD_DIR}${path.sep}`)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  serveFile(res, filePath);
}

function serveStatic(res, pathname) {
  const cleanPath = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  const filePath = path.resolve(ROOT_DIR, `.${cleanPath}`);

  if (!filePath.startsWith(`${ROOT_DIR}${path.sep}`)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  serveFile(res, filePath);
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(err.code === "ENOENT" ? 404 : 500, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      res.end(err.code === "ENOENT" ? "404 Not Found" : `Server Error: ${err.code}`);
      return;
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
}

initDatabase();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    // Handle login API endpoint
    if (url.pathname === "/api/login" && req.method === "POST") {
      const parsed = await parseJsonBody(req);
      const password = process.env.ACCESS_PASSWORD;

      if (!password) {
        sendJson(res, 200, { success: true });
        return;
      }

      if (parsed.password === password) {
        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Set-Cookie": `auth_password=${encodeURIComponent(password)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`,
        });
        res.end(JSON.stringify({ success: true }));
      } else {
        sendJson(res, 401, { error: "密码错误" });
      }
      return;
    }

    // Intercept unauthorized requests if ACCESS_PASSWORD is configured
    if (process.env.ACCESS_PASSWORD && !isAuthorized(req)) {
      if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) {
        sendJson(res, 401, { error: "Unauthorized", needLogin: true });
        return;
      }
      serveLoginPage(res);
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      const handled = await handleApi(req, res, url);
      if (!handled) {
        sendJson(res, 404, { error: "API endpoint not found." });
      }
      return;
    }

    if (url.pathname.startsWith("/uploads/")) {
      serveUploads(res, url.pathname);
      return;
    }

    serveStatic(res, url.pathname);
  } catch (error) {
    sendError(res, error);
  }
});

server.listen(PORT, () => {
  console.log(`[Resume Server] Running at http://localhost:${PORT}/`);
  console.log(`[Resume Server] SQLite database: ${DB_PATH}`);
});
