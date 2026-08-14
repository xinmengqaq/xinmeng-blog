FROM python:3.13-slim

# 直接复制固定版本的 uv，不通过 pip 安装构建工具。
COPY --from=ghcr.io/astral-sh/uv:0.12.3 /uv /uvx /bin/

WORKDIR /app

# uv 把依赖安装到项目虚拟环境，运行时直接使用该环境。
ENV UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"

# 只有依赖声明变化时才重建依赖层；下载缓存跨构建复用。
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

# 源码和环境变量示例变化只会重建轻量复制层。
COPY app ./app
COPY .env.example ./.env.example

# 创建存储目录（挂卷会覆盖它）
RUN mkdir -p /app/storage

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
