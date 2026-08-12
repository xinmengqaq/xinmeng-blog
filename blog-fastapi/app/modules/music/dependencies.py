from typing import Annotated

from fastapi import Depends

from app.db.session import SessionDep
from app.modules.file.storage.dependencies import MusicAudioStorageDep
from app.modules.music.service import MusicService


def get_music_service(
    session: SessionDep,
    storage: MusicAudioStorageDep,
) -> MusicService:
    return MusicService(session=session, storage=storage)


MusicServiceDep = Annotated[MusicService, Depends(get_music_service)]
