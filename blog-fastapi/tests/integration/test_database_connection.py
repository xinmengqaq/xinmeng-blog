import asyncio
import os

import asyncpg
import pytest
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import engine


pytestmark = pytest.mark.skipif(
    os.getenv("RUN_PRODUCTION_DB_TEST") != "1",
    reason="设置 RUN_PRODUCTION_DB_TEST=1 后才检查生产数据库连接",
)


def test_production_database_connection_returns_one():
    async def check_connection() -> None:
        connection_error = None
        try:
            try:
                async with engine.connect() as connection:
                    result = await connection.execute(text("SELECT 1"))
            except (asyncpg.PostgresError, SQLAlchemyError, OSError, TimeoutError) as exc:
                connection_error = type(exc).__name__
            else:
                assert result.scalar_one() == 1
        finally:
            await engine.dispose()

        if connection_error:
            pytest.fail(f"生产数据库连接失败：{connection_error}", pytrace=False)

    asyncio.run(check_connection())
