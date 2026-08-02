from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # BaseSettings 按字段名自动读取 .env 与环境变量（大小写不敏感），并做类型校验。
    # 相比 os.getenv：集中管理、类型安全、.env 与环境变量都覆盖；适合含敏感值的 DATABASE_URL。
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # .env 含未声明变量时不报错，避免后续加配置互相冲突
    )

    app_env: str = "development"
    # 开发环境开放接口文档，正式环境通过 DOCS_ENABLED=false 关闭
    docs_enabled: bool = True
    # 必填、无默认值：不读 .env 且无环境变量时启动即报错，绝不用硬编码密码兜底
    database_url: str
    # SQL 日志开关：默认关闭，不读 .env 时不打印 SQL（生产安全）；开发在 .env 设 DB_ECHO=true 开启
    db_echo: bool = False
    # 控制台应用日志级别：设了就用设的值，不设时按 APP_ENV 自动（dev=DEBUG, prod=INFO）
    log_level: str | None = None

    jwt_secret: str
    jwt_expire_seconds: int  # 无默认：必须配
    jwt_clock_skew_seconds: int  # 无默认：必须配


settings = Settings()
DEBUG = settings.app_env == "development"
