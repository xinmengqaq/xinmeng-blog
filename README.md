# 薪梦集

个人博客系统，前后端分离。有公开阅读站、内容管理后台、普通用户账号，以及图片 / 音乐文件服务，数据库用 PostgreSQL。

前端是 React，业务后端是 Spring Boot（文章、账号、管理员这些），文件和音乐走 FastAPI。

## 预览

![薪梦集首页预览](assets/readme/home.png)

## 功能

### 公开站点

- 首页文章和音乐播放器
- 文章列表，支持关键词搜索、分类和标签筛选
- 文章详情：正文目录、阅读设置、点赞
- 站点背景和页面动效

### 普通用户

- 邮箱注册（图片验证码 + 邮件验证码）
- 登录 / 记住登录 / 退出
- 改昵称、换头像
- 改邮箱、改密码、忘记密码重置
- 注销账号，以及恢复还在冷静期的账号

### 管理后台

- 管理员登录（图片验证码 + JWT）
- 管理员资料、头像、密码
- 文章：新建、编辑、Markdown 导入、删除、批量删除
- 封面图和正文图片管理
- 发布状态、置顶、推荐
- 分类和标签
- 音乐：上传、列表、试听、改信息、启停、删除
- 站点背景：上传、更换、移除

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

字体许可是 SIL Open Font License 1.1。

## 项目结构

```text
项目学习/
├─ blog-web/       前台 + 管理后台
├─ springboot/     业务接口和数据访问
├─ blog-fastapi/   图片、音乐文件
└─ pgsql/          表结构和初始化账号
```

Spring Boot 里按模块拆的：

```text
springboot/
├─ springboot-web/       入口
├─ springboot-common/    统一响应、异常、JWT
├─ springboot-admin/     管理员登录
├─ springboot-article/   文章、分类、标签
├─ springboot-user/      普通用户
└─ springboot-site/      站点配置
```

## 请求分发

Nginx 把文件和音乐相关请求转到 FastAPI（8000），其它业务接口走 Spring Boot（9090）：

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

两边连的是同一个 PostgreSQL，JWT 密钥也要一致。

库里存管理员、用户、文章、分类、标签、点赞、音乐、站点配置，以及文件访问地址。图片和音乐本体在 FastAPI 管的目录里，数据库只记路径。

## 环境要求

- JDK 21、Maven
- Node.js、npm
- Python 3.13、uv
- PostgreSQL 18

## 配置

### Spring Boot

本地可以直接改 `springboot/springboot-web/src/main/resources/application-local.yml`，也可以用同名环境变量：

```text
DB_URL=jdbc:postgresql://localhost:5433/spring_blog?currentSchema=public&sslmode=disable
DB_USERNAME=blog_remote
DB_PASSWORD=<数据库密码>
JWT_SECRET=<JWT 密钥>
DOCS_ENABLED=true
```

### FastAPI

在 `blog-fastapi/` 下建或改 `.env`，字段和 `app/core/config.py` 对得上就行：

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

在 `blog-web/` 下建或改 `.env`：

```text
VITE_API_BASE=/api
```

不设的话默认也是 `/api`。`.env.example` 里还有些图像工具相关字段，前端运行时目前没用到。

两个后端必须连同一库、同一份 `JWT_SECRET`。真实账号密码和密钥别提交进仓库。

### PostgreSQL

手动部署时不用旧的 `pgsql/schema.sql`，直接执行新的 `pgsql/migrations/V1__current_schema_baseline.sql` 建表和写入默认管理员，例如：

```powershell
psql -h localhost -p 5433 -U blog_remote -d spring_blog -f pgsql/migrations/V1__current_schema_baseline.sql
```

默认管理员账号密码都是 `admin`，第一次登录后请马上改掉。

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

用 Docker Compose 拉起 PostgreSQL、Spring Boot、FastAPI 和 Nginx。首次部署和以后更新都走 Docker 就行，宿主机不用单独装 Java / Python / Node / PostgreSQL，也不用手跑建库脚本。

### 首次部署

两条路：

1. 克隆源码，让 Docker 本地构建
2. 只下载公开部署文件，直接拉 Docker Hub 镜像

两边用的 PostgreSQL、Flyway 和初始化规则是同一套。

#### 方式一：克隆项目部署

```powershell
git clone https://github.com/xinmengqaq/xinmeng-blog.git
cd xinmeng-blog
```

#### 1. 准备环境变量

照着根目录 `.env.example` 写一份 `.env`。开源版至少要有：

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

`DB_PASSWORD` 和 `JWT_SECRET` 请用难猜的随机值。Spring Boot 和 FastAPI 共用同一个数据库账号，JWT 密钥也必须相同。

默认管理员还是 `admin` / `admin`，空库第一次跑 `V1` 时写入，库里存的是 BCrypt 哈希。登录后尽快改密码。

#### 2. 一键启动

```powershell
docker compose --env-file .env up -d --build --wait
```

会自动构建镜像、起数据库，再用官方 Flyway 镜像跑 `V1` 基线；成功之后才拉起两个后端和 Nginx。`V1` 只写默认管理员，不会塞演示文章、分类、标签、音乐或普通用户。

开源部署还会在同一个 PostgreSQL 容器里建一个 `springboot_vue_test` 测试库，和业务库分开，不会多起一个数据库容器。

#### 方式二：直接拉取公开镜像

不拉三个工程源码，只拿 Compose、环境变量示例和迁移文件：

```powershell
New-Item -ItemType Directory -Force xinmeng-blog-deploy | Out-Null
Set-Location xinmeng-blog-deploy

$base = "https://raw.githubusercontent.com/xinmengqaq/xinmeng-blog/main"
Invoke-WebRequest "$base/docker-compose.opensource.yml" -OutFile docker-compose.yml
Invoke-WebRequest "$base/.env.example" -OutFile .env.example
New-Item -ItemType Directory -Force pgsql/init, pgsql/migrations | Out-Null
Invoke-WebRequest "$base/pgsql/init/01-create-test-database.sh" -OutFile pgsql/init/01-create-test-database.sh
Invoke-WebRequest "$base/pgsql/migrations/V1__current_schema_baseline.sql" -OutFile pgsql/migrations/V1__current_schema_baseline.sql
Copy-Item .env.example .env
```

改好 `.env` 之后拉镜像并启动：

```powershell
docker compose --env-file .env pull
docker compose --env-file .env up -d --wait
```

公开镜像标签：

- `xinmengqwq/xinmeng-blog:springboot`
- `xinmengqwq/xinmeng-blog:fastapi`
- `xinmengqwq/xinmeng-blog:web`

公开部署是通用 HTTP 配置，没有个人域名和证书。要 HTTPS 的话，在外面的反向代理上自己配。

#### 登录后台

起来之后：

- 公开站点：`http://localhost/`
- 管理后台：`http://localhost/admin/login`

默认 `admin` / `admin`，进门先改密码。

### 更新已有部署

保留当初的 `.env` 和 PostgreSQL 数据目录，然后：

```powershell
git pull
docker compose --env-file .env up -d --build --wait
```

有改动的应用镜像会重建，数据库只跑还没执行过的增量迁移。已有管理员、用户、文章、分类、标签、音乐、站点配置和上传文件都不会被覆盖。

如果迁移失败，新版本后端不会起来。修好后再跑同一条命令即可。

别用 `docker compose down -v`，也别删 `PGDATA_HOST` 指向的目录——那会把持久化数据一起清掉。只想停服务的话：

```powershell
docker compose --env-file .env stop
```

再启动还是用上面的一键部署命令。

### 服务器版本

服务器也用根目录 `.env`，把模式改成：

```text
DEPLOY_MODE=server
```

启动 / 更新：

```powershell
docker compose --env-file .env up -d --build --wait
```

服务器版不会建 `springboot_vue_test`。已有非空库第一次接 Flyway 时只登记为 `V1`，不会重跑建表和默认管理员；之后只跑新增的 `V2`、`V3` 等。

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
