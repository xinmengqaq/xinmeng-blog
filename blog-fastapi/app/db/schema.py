from app.db.base import Base
from app.db.session import engine


async def create_tables(model: type[Base], *other_models: type[Base]) -> None:
    tables = [mapped_class.__table__ for mapped_class in (model, *other_models)]

    async with engine.begin() as connection:
        await connection.run_sync(
            lambda sync_connection: Base.metadata.create_all(
                sync_connection,
                tables=tables,
            )
        )
