FROM python:3.13-slim

WORKDIR /app

# 复制依赖声明 + 锁文件（uv 靠这个锁定精确版本）
COPY pyproject.toml uv.lock ./

# 用 uv 同步依赖到系统环境（等价于装依赖）
RUN pip install uv && uv sync --frozen --no-dev --no-install-project

# COPY 业务源码（uvicorn 直接跑源码，不编译）
COPY app ./app

# 创建存储目录（挂卷会覆盖它）
RUN mkdir -p /app/storage

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]