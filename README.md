# Resume Builder (简历生成器)

一个支持多用户、实时页面编辑、JSON 导入导出、头像上传、SQLite 持久化、**访问密码保护**和 Docker 部署的个人简历管理与生成应用。

---

## 核心功能

- **多风格排版调参**：支持经典排印 (Pentagram)、瑞士网格 (Müller-Brockmann) 及留白之禅 (原研哉) 三种流派，可一键切换左右分栏/上下通栏、几何头像、版面紧凑度，并支持 A4 打印预览。
- **内容编辑器**：支持在线编辑基本信息、个人优势、核心技能与工作/项目经历，支持头像上传及实时保存到 SQLite。
- **新建用户与多账号**：左上角可灵活新建与切换用户。新建用户时，默认简历数据将**初始化为空白**，方便从零开始构建。
- **数据导入与导出**：支持一键导出当前用户 JSON、直接修改/应用 JSON 源码，或通过 `/api/resume.json?userId=用户ID` 导出。
- **安全密码访问控制**：支持通过环境变量设置访问密码，在公网部署时可保护个人隐私。

---

## 本地运行

### 1. 启动服务
```bash
npm run dev
```
打开 `http://localhost:3000`。首次启动会自动创建 SQLite 数据库；如果存在旧版单用户数据，会自动迁移为默认用户。

默认数据持久化路径：
- 数据库：`data/resume.sqlite`
- 头像上传：`data/uploads/`

### 2. 配置自定义环境变量
您可以使用以下环境变量来自定义运行参数：
- `ACCESS_PASSWORD`：设置后，访问网页或 API 时将要求进行密码鉴权（登录一次后，客户端会安全保存 1 年 Cookie 维持登录状态）。
- `DATA_DIR`：指定数据存放目录。
- `PORT`：指定服务端口号。

例如，以密码保护方式启动：
```bash
ACCESS_PASSWORD=your-secret-password PORT=3000 npm start
```

---

## Docker 运行

### 1. 使用 Docker Compose 一键部署
我们已在 `docker-compose.yml` 中定义了服务配置，您可以使用以下命令构建镜像并启动容器：
```bash
docker compose up -d --build
```
应用地址：`http://localhost:3000`。SQLite 数据和上传的头像会自动挂载并保存在 Docker volume `resume-data` 中。

### 2. 在 Docker 中配置密码保护
只需修改 `docker-compose.yml` 在 `resume` 服务下添加 `ACCESS_PASSWORD` 环境变量即可：
```yaml
services:
  resume:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ACCESS_PASSWORD=your-secret-password
    volumes:
      - resume-data:/data
    restart: unless-stopped
```

### 3. 单独构建并运行 Docker 镜像
```bash
# 构建镜像
docker build -t resume-builder:latest .

# 运行镜像并设置密码保护
docker run -d -p 3000:3000 -e ACCESS_PASSWORD=your-secret-password -v resume-data:/data --name resume-app resume-builder:latest
```

---

## 导入与导出 JSON 数据

在网页端打开“编辑内容”抽屉后，您可以：
- **导出 JSON**：点击下载当前用户的结构化简历 `.json` 文件。
- **刷新 JSON**：重置文本域为当前最新数据。
- **直接编辑 JSON**：直接在文本域修改 JSON 数据并点击“应用 JSON”，确认无误后点击“保存到 SQLite”即可。
- **API 导出**：可直接请求接口获取：`/api/resume.json?userId=用户ID`（若开启密码保护，需携带合法的登录 Cookie）。
