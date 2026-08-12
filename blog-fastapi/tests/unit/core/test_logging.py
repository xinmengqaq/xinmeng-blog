from pathlib import Path
from unittest.mock import Mock

from app.core import logging as app_logging


def test_development_logging_uses_console_only(monkeypatch, tmp_path: Path):
    test_logger = Mock()
    access_logger = app_logging.logging.getLogger("uvicorn.access")
    monkeypatch.setattr(app_logging, "logger", test_logger)
    monkeypatch.setattr(access_logger, "disabled", False)

    app_logging.setup_logging(environment="development", log_dir=tmp_path)

    test_logger.remove.assert_called_once_with()
    assert test_logger.add.call_count == 1
    assert test_logger.add.call_args.args[0] is app_logging.sys.stderr
    assert access_logger.disabled is True


def test_production_logging_uses_rotating_application_and_error_files(monkeypatch, tmp_path: Path):
    test_logger = Mock()
    monkeypatch.setattr(app_logging, "logger", test_logger)

    app_logging.setup_logging(environment="production", log_dir=tmp_path)

    assert test_logger.add.call_count == 2
    calls = test_logger.add.call_args_list
    assert calls[0].args[0] == tmp_path / "application.log"
    assert calls[0].kwargs["rotation"] == "20 MB"
    assert calls[0].kwargs["retention"] == "30 days"
    assert calls[0].kwargs["compression"] == "gz"
    assert calls[1].args[0] == tmp_path / "error.log"
    assert calls[1].kwargs["level"] == "ERROR"


def test_test_environment_disables_log_output(monkeypatch, tmp_path: Path):
    test_logger = Mock()
    monkeypatch.setattr(app_logging, "logger", test_logger)

    app_logging.setup_logging(environment="test", log_dir=tmp_path)

    test_logger.remove.assert_called_once_with()
    test_logger.add.assert_not_called()
