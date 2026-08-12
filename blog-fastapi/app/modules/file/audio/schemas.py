from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class AudioSaveResult:
    # 音频子系统对外交付的不可变结果：URL 与毫秒时长。
    # 保存失败不返回半成品，因此不包含未提交的内部状态。
    audio_url: str
    duration_ms: int
