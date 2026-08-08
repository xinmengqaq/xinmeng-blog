import sys

from app.modules.file.image import service as _service

sys.modules[__name__] = _service
