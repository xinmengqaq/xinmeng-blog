from sqlalchemy import BigInteger, Boolean, CheckConstraint, DateTime, Index, Integer, String

from app.modules.music.models import Music


table = Music.__table__


def test_table_name_matches_design():
    assert table.name == "music"


def test_columns_match_design_types_and_lengths():
    assert isinstance(table.c.id.type, BigInteger)
    assert table.c.id.primary_key is True
    assert table.c.id.autoincrement is True

    assert isinstance(table.c.title.type, String)
    assert table.c.title.type.length == 120

    assert isinstance(table.c.artist.type, String)
    assert table.c.artist.type.length == 120

    assert isinstance(table.c.audio_url.type, String)
    assert table.c.audio_url.type.length == 500

    assert isinstance(table.c.duration_ms.type, Integer)

    assert isinstance(table.c.is_enabled.type, Boolean)

    assert isinstance(table.c.created_at.type, DateTime)
    assert table.c.created_at.type.timezone is True

    assert isinstance(table.c.updated_at.type, DateTime)
    assert table.c.updated_at.type.timezone is True


def test_nullability_matches_design():
    # 必填列不可空；artist 唯一可空
    assert table.c.title.nullable is False
    assert table.c.artist.nullable is True
    assert table.c.audio_url.nullable is False
    assert table.c.duration_ms.nullable is False
    assert table.c.is_enabled.nullable is False
    assert table.c.created_at.nullable is False
    assert table.c.updated_at.nullable is False


def test_audio_url_is_unique():
    assert table.c.audio_url.unique is True


def test_duration_positive_check_constraint_declared():
    # 命名约定会把 name="duration_positive" 渲染成 ck_music_duration_positive
    check = next(
        (
            c
            for c in table.constraints
            if isinstance(c, CheckConstraint) and "duration_ms > 0" in str(c.sqltext)
        ),
        None,
    )
    assert check is not None
    assert check.name == "ck_music_duration_positive"


def test_created_at_id_ordering_index_declared():
    index = next(
        (i for i in table.indexes if [c.name for c in i.columns] == ["created_at", "id"]),
        None,
    )
    assert index is not None
    assert index.name == "ix_music_created_id"
