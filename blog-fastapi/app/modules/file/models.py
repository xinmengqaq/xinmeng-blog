import sys

from app.modules.file.image import models as _models

sys.modules[__name__] = _models
