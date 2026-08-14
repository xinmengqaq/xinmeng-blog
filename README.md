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

Docker 部署不需要在 pgAdmin 中手工建表，也不再使用旧的 `pgsql/schema.sql`。数据库结构由 Flyway 的 `V1` 基线统一创建和更新。

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

项目使用 Docker Compose 编排 PostgreSQL、Spring Boot、FastAPI 和 Nginx。首次部署和后续更新都由 Docker 完成，不需要在宿主机安装 Java、Python、Node.js、PostgreSQL 或手工执行数据库脚本。

### 首次部署

#### 1. 准备环境变量

参考根目录 `.env.example` 准备 `.env`，开源版设置：

```text
DEPLOY_MODE=opensource

DB_NAME=spring_blog
DB_USER=<PostgreSQL 与两个后端共用的数据库用户>
DB_PASSWORD=<共用数据库密码>
PGDATA_HOST=<宿主机 PostgreSQL 数据目录，例如 C:/docker/blog_pgdata>

JWT_SECRET=<与两个后端共用的 JWT 密钥>

MAIL_HOST=<SMTP 服务器>
MAIL_USERNAME=<发件邮箱>
MAIL_PASSWORD=<邮箱授权码>
MAIL_PORT=465

```

`DB_PASSWORD` 和 `JWT_SECRET` 应使用无法猜测的随机值。Spring Boot 与 FastAPI 使用同一个数据库账号，并且必须使用同一份 `JWT_SECRET`。

默认管理员账号和密码均为 `admin`，由 `V1` 在空库首次建表时写入，数据库保存的是 BCrypt 哈希而不是明文。首次登录后应立即修改密码。

#### 2. 一键启动

```powershell
docker compose --env-file .env up -d --build --wait
```

Docker 会自动构建项目镜像、启动数据库，再由官方 Flyway 镜像执行 `V1` 数据库基线，成功后才启动两个后端和 Nginx。`V1` 只写入默认管理员，不会插入演示文章、分类、标签、音乐或普通用户数据。

开源部署还会在同一个 PostgreSQL 容器中创建 `springboot_vue_test` 测试库。业务库和测试库互相独立，不会增加第二个数据库容器。

#### 3. 登录后台

部署完成后访问：

- 公开站点：`http://localhost/`
- 管理后台：`http://localhost/admin/login`

使用默认账号密码 `admin/admin` 登录，首次登录后应立即修改密码。

### 更新已有部署

保留首次部署时使用的 `.env` 和 PostgreSQL 数据目录，然后拉取新版本：

```powershell
git pull
docker compose --env-file .env up -d --build --wait
```

更新时 Docker 会重新构建发生变化的应用镜像，并只执行尚未执行的数据库增量更新。已有管理员、用户、文章、分类、标签、音乐、站点配置和上传文件不会被重新初始化或覆盖。

如果数据库更新失败，新版本后端不会启动。排查并修复错误后，可以使用同一个命令重新执行。

不要执行 `docker compose down -v`，也不要删除 `PGDATA_HOST` 指向的目录；这两种操作会删除持久化数据库数据。只停止服务时使用：

```powershell
docker compose --env-file .env stop
```

再次启动仍使用同一个一键部署命令。

### 服务器版本

服务器同样使用根目录 `.env`，其中设置：

```text
DEPLOY_MODE=server
```

启动或更新命令：

```powershell
docker compose --env-file .env up -d --build --wait
```

服务器版本不会创建 `springboot_vue_test`。已有非空数据库第一次接入 Flyway 时登记为 `V1`，不会重新执行 `V1` 的建表和默认管理员数据；以后只执行新增的 `V2`、`V3` 等迁移。

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
