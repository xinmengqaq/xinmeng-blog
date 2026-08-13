from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.router_registry import RouterRegistry
from app.core.config import settings
from app.core.exceptions.exception_handlers import ExceptionHandlerRegistry
from app.core.logging import setup_logging
from app.core.paths import STORAGE_DIR
from app.core.request_logging import log_http_request
from app.core.schemas import ApiResponse, HealthCheckData
from app.db.lifespan import lifespan

setup_logging()

app = FastAPI(
    lifespan=lifespan,
    openapi_url="/openapi.json" if settings.docs_enabled else None,
    docs_url="/docs" if settings.docs_enabled else None,
    redoc_url="/redoc" if settings.docs_enabled else None,
)

app.middleware("http")(log_http_request)

# 应用入口只负责创建应用并调用装配器，具体注册逻辑由对应注册表维护。
ExceptionHandlerRegistry(app).register_all()

# 路由集中装配后，模块注册细节不会堆积到应用入口。
RouterRegistry(app).register_all()

# 挂载静态文件：/files/articles/content/x.png 映射到项目 storage/articles/content/x.png
# 必须在路由装配之后挂载，否则 StaticFiles 会先拦截业务路由
app.mount("/files", StaticFiles(directory=str(STORAGE_DIR)), name="files")

@app.get("/health",
          response_model=ApiResponse[HealthCheckData])
async def health_check() -> ApiResponse[HealthCheckData]:
    return ApiResponse(data=HealthCheckData(status="ok"))


