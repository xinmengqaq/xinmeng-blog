from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession


from app.core.config import settings

# ============ 引擎：应用级单例，持有连接池 ============
# 引擎是应用和数据库之间的"总水管"，启动时连库并建连接池，所有请求共享这一个。
# 这行在模块加载时执行一次；不能每请求建一个引擎，否则会建无数连接池耗尽库连接数。
engine = create_async_engine(
    settings.database_url,

    # ---- SQL 日志类 ----
    echo=settings.db_echo,
    # 打印每条执行的 SQL 语句和参数（走 sqlalchemy.engine 标准 logger，INFO 级）。
    # 与 Loguru 应用日志是两套独立体系（Loguru 不拦截标准 logging，与不拦截 Uvicorn 同理）。
    # 开发设 true 看实际 SQL；生产设 false 避免噪音和参数泄露。

    echo_pool=False,
    # 打印连接池事件（借出/归还/回收/失效）；设 "debug" 更详细，连结果行都打。
    # 排查连接泄漏或池耗尽时临时开；平时关，避免噪音。

    # ---- 连接池类 ----
    pool_pre_ping=True,
    # 取连接前发轻量探测，避开已被数据库侧或中间件超时关闭的死连接。
    # 默认 False；存在 PgBouncer/云数据库等会回收空闲连接时建议开，否则会 ConnectionResetError。

    pool_size=5,
    # 连接池常驻连接数（QueuePool 默认 5）。连接懒创建：首次用到才建，不是启动时预建。
    # 高并发服务调大；本地学习用默认即可。

    max_overflow=10,
    # 超出 pool_size 后还能临时创建的连接数（默认 10）。
    # 突发流量时池临时扩容到 pool_size+max_overflow；这些超额连接用完即关，不回池常驻。

    pool_recycle=3600,
    # 连接存活秒数，到期自动重建（默认 -1 不回收）。
    # 防止数据库或中间件超时关闭空闲连接，导致下次用到时报错。设成略小于数据库的 idle_timeout 最稳。

    pool_timeout=30.0,
    # 池里拿不到连接时的最长等待秒数，超时报 TimeoutError（默认 30）。
    # 拿不到说明池已满且都在用；调大让请求多等一会，调小让请求快速失败而非堆积。

    # future 参数在 2.x 已默认 True 且即将废弃，不显式写；autocommit 模式在 2.x 已移除。
)


# ============ 会话工厂：生产请求级 AsyncSession ============
# 会话是 ORM 的"工作台"：查、改、删对象时它跟踪变化，提交时统一翻译成 SQL。
# 会话是请求级的（每请求一个，互不干扰）；工厂统一会话配置，每次生产一个新的。
async_session_factory = async_sessionmaker(
    bind=engine,
    # 会话从哪个引擎借连接。一个引擎对应一个连接池，所有会话共用这一个池。

    class_=AsyncSession,
    # 生产异步会话类，配合 async/await 用。默认就是 AsyncSession，显式写出便于阅读。

    expire_on_commit=False,
    # 提交后不让 ORM 对象过期。默认 True：commit 后对象属性清空，下次访问触发重新查库刷新。
    # 异步环境官方推荐 False：请求结束会话即关，重新查会报"会话已关闭"。


    autoflush=True,
    # 查询前自动把挂起的改动刷到数据库（默认 True）。
    # 比如改了 cover_url 再查 Article，autoflush 先把 update 发出去，保证查到最新值。
    # 关掉则要手动 flush；除非有明确理由（避免意外 SQL），否则保持默认。

    info=None,
    # 给每个会话附加自定义元数据字典（默认 None）。
    # 可放请求 ID、租户标识等供日志读取；当前不需要。
)
# yield 依赖：请求前生产会话交给路由，响应后执行 yield 之后代码关闭会话、归还连接。
# async with 保证路由抛异常时会话也关闭，连接不泄漏。
# 返回类型 AsyncGenerator[AsyncSession, None]：yield 出 AsyncSession，不接收回传值。
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session

# 类型别名：路由参数写 session: SessionDep 即注入一个请求级 AsyncSession。
# 写法与 StorageDep 一致：Annotated[类型, Depends(提供者)]。
SessionDep = Annotated[AsyncSession, Depends(get_db_session)]