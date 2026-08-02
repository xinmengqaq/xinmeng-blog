from enum import StrEnum


class ContentImageCleanupResult(StrEnum):

    # 删除成功
    DELETED = "deleted"
    # 已删除
    ALREADY_ABSENT = "already_absent"
    # 仍在使用
    RETAINED_IN_USE = "retained_in_use"
    # 外部忽略
    EXTERNAL_IGNORED = "external_ignored"
