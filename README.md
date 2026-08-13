# 薪梦集

薪梦集是一套前后端分离的个人博客系统，包含公开阅读站点、内容管理后台、独立图片服务和 PostgreSQL 关系型数据库。

项目最初由 React 和 Spring Boot 组成，后来加入 FastAPI，单独承载更适合 Python 的能力。它目前负责图片处理与文件存储，后续会在这套服务上继续接入 AI、向量检索和其他 Python 生态能力，Spring Boot 仍负责博客的核心业务。

## 预览

![薪梦集首页预览](assets/readme/home.png)

## 功能

### 公开站点

- 首页文章展示
- 文章列表、关键词搜索、分类和标签筛选
- 文章详情、目录导航、阅读设置和点赞
- 站点背景与页面动效

### 管理后台

- 管理员登录、图片验证码和 JWT 鉴权
- 管理员资料、头像和密码管理
- 文章新建、编辑、删除和批量删除
- 文章发布状态、置顶和推荐管理
- 分类与标签管理
- 站点背景管理

### 图片服务

- 管理员头像上传与删除
- 文章封面上传与删除
- 正文图片上传与引用检查
- 站点背景上传与删除
- 图片格式、大小和真实内容校验

## 技术栈

| 工程 | 技术 |
| --- | --- |
| `blog-web` | React、TypeScript、Vite、React Router、TanStack Query、Zustand、Axios、GSAP |
| `springboot` | Java 21、Spring Boot 4.1、MyBatis Plus、PageHelper、JWT、Caffeine |
| `blog-fastapi` | Python 3.13、FastAPI、SQLAlchemy、asyncpg、Pillow、PyJWT |
| 数据库 | PostgreSQL 18 |

## 第三方资源

- 字体：[Noto Sans SC](https://fonts.google.com/noto/specimen/Noto+Sans+SC)、[寒蝉圆黑体（Chill Round Gothic）](https://github.com/Warren2060/ChillRoundGothic)
- 图标：[Lucide Icons](https://lucide.dev/)

字体遵循 SIL Open Font License 1.1。

## 项目结构

```text
项目学习/
├─ blog-web/       前台站点与管理后台
├─ springboot/     业务接口与数据访问
├─ blog-fastapi/   图片处理与文件存储
└─ pgsql/          PostgreSQL 表结构与初始化账号
```

Spring Boot 模块：

```text
springboot/
├─ springboot-web/       应用入口
├─ springboot-common/    公共响应、异常处理与 JWT
├─ springboot-admin/     管理员与登录认证
├─ springboot-article/   文章、分类与标签
└─ springboot-site/      站点配置
```

## 请求分发

Nginx 将文件和音乐模块转发到 FastAPI `8000`，其余业务接口转发到 Spring Boot `9090`：

```nginx
location ^~ /api/admin/files/ {
    client_max_body_size 12m;
    proxy_pass http://fastapi:8000;
}

location ^~ /api/user/files/ {
    client_max_body_size 5m;
    proxy_pass http://fastapi:8000;
}

location ^~ /api/admin/music/ {
    client_max_body_size 101m;
    proxy_pass http://fastapi:8000;
}

location ^~ /api/music/ {
    proxy_pass http://fastapi:8000;
}

location ^~ /files/ {
    proxy_pass http://fastapi:8000;
}

location ^~ /api/ {
    proxy_pass http://springboot:9090;
}
```

Spring Boot 与 FastAPI 使用同一个 PostgreSQL 数据库和同一份 JWT 密钥。

PostgreSQL 保存管理员、文章、分类、标签、站点配置和文件地址等业务数据。图片文件保存在 FastAPI 管理的文件目录中，数据库只记录访问地址。

## 环境要求

- JDK 21、Maven
- Node.js、npm
- Python 3.13、uv
- PostgreSQL 18

## 配置

### Spring Boot

在 `springboot/springboot-web/src/main/resources/application-local.yml` 中直接配置本地值，或设置同名环境变量：

```text
DB_URL=jdbc:postgresql://localhost:5433/spring_blog?currentSchema=public&sslmode=disable
DB_USERNAME=blog_remote
DB_PASSWORD=<数据库密码>
JWT_SECRET=<JWT 密钥>
DOCS_ENABLED=true
```

### FastAPI

直接在 `blog-fastapi/` 根目录创建或编辑 `.env`。字段与 `app/core/config.py` 一一对应：

```text
APP_ENV=development
DOCS_ENABLED=true
DATABASE_URL=postgresql+asyncpg://blog_remote:<数据库密码>@localhost:5433/spring_blog
DB_ECHO=true
LOG_LEVEL=DEBUG
JWT_SECRET=<与 Spring Boot 相同的 JWT 密钥>
JWT_EXPIRE_SECONDS=28800
JWT_CLOCK_SKEW_SECONDS=120
```

### 前端

直接在 `blog-web/` 根目录创建或编辑 `.env`：

```text
VITE_API_BASE=/api
```

前端未设置 `VITE_API_BASE` 时同样默认使用 `/api`。`.env.example` 中其余图像工具字段目前没有被前端运行时代码读取。

两个后端必须连接同一个数据库，并使用同一份 `JWT_SECRET`。不要提交真实账号、密码或密钥。

### PostgreSQL

在 pgAdmin 中新建名为 `spring_blog` 的数据库，然后选中它并在“查询工具”中执行 `pgsql/schema.sql`。

默认管理员账号和密码均为 `admin`，首次登录后应立即修改密码。

## 启动

```powershell
cd springboot
mvn -pl springboot-web -am spring-boot:run
```

```powershell
cd blog-fastapi
uv sync --group test
uv run uvicorn app.main:app --reload --port 8000
```

```powershell
cd blog-web
npm ci
npm run dev
```

## Docker 部署

使用根目录的 `docker-compose.yml` 一键编排四个服务：PostgreSQL、Spring Boot、FastAPI 和 Nginx。

### 1. 构建产物

`springboot` 和 `blog-web` 的镜像直接复用本地构建产物，先完成打包：

```powershell
cd springboot
mvn -pl springboot-web -am package -DskipTests
```

```powershell
cd blog-web
npm ci
npm run build
```

### 2. 准备环境变量

在仓库根目录创建 `.env`，`docker-compose.yml` 会按名字引用：

```text
DB_USER=<数据库用户>
DB_PASSWORD=<数据库密码>
DB_APP_USER=<应用数据库用户>
DB_APP_PASSWORD=<应用数据库密码>
PGDATA_HOST=<宿主机 PostgreSQL 数据目录，例如 C:/docker/blog_pgdata>
JWT_SECRET=<与两个后端共用的 JWT 密钥>
MAIL_HOST=<SMTP 服务器>
MAIL_USERNAME=<发件邮箱>
MAIL_PASSWORD=<邮箱授权码>
MAIL_PORT=465
# 可选：FastAPI 的 AI 能力
OPENAI_BASE_URL=
OPENAI_API_KEY=
```

Spring Boot 与 FastAPI 必须使用同一份 `JWT_SECRET`。

### 3. 准备 TLS 证书

Nginx 容器以只读方式挂载两份证书，启动前放到 `blog-web/nginx/conf/` 下：

- `fullchain.pem`
- `privkey.pem`

证书文件不会被提交到仓库。Nginx 配置中的 `server_name` 固定为 `www.xinmengqaq.top`，使用其他域名时需修改 `blog-web/nginx/conf/nginx.conf` 后重新构建。

### 4. 构建并启动

```powershell
docker compose up -d --build
```

启动后通过 `https://<你的域名>` 访问公开站点和管理后台。生产环境建议将数据库端口绑定到 `127.0.0.1`，只保留 Nginx 的 `80`/`443` 对外。

## 访问地址

- 公开站点：`http://localhost:5173/`
- 管理后台：`http://localhost:5173/admin/login`
- Spring Boot API 文档：`http://localhost:9090/swagger-ui/index.html`
- FastAPI API 文档：`http://localhost:8000/docs`
- FastAPI 健康检查：`http://localhost:8000/health`

## 测试

```powershell
cd springboot
mvn test
```

```powershell
cd blog-fastapi
uv run pytest
```

```powershell
cd blog-web
npm run test:run
npm run lint
npm run typecheck
npm run build
```
