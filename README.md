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

前端开发服务器监听 `5173` 端口：

- `/api/admin/files` 和 `/files` 转发到 FastAPI `8000`
- 其他 `/api` 请求转发到 Spring Boot `9090`

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
DB_URL=jdbc:postgresql://localhost:5432/springboot_vue?currentSchema=public&sslmode=disable
DB_USERNAME=<数据库用户名>
DB_PASSWORD=<数据库密码>
JWT_SECRET=<JWT 密钥>
DOCS_ENABLED=true
```

### FastAPI

直接在 `blog-fastapi/` 根目录创建或编辑 `.env`。字段与 `app/core/config.py` 一一对应：

```text
APP_ENV=development
DOCS_ENABLED=true
DATABASE_URL=postgresql+asyncpg://<数据库用户名>:<数据库密码>@localhost:5432/springboot_vue
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

在 pgAdmin 中新建名为 `springboot_vue` 的数据库，然后选中它并在“查询工具”中执行 `pgsql/schema.sql`。

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
