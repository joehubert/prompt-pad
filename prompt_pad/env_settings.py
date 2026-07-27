# -----------------------------------------------------------------------------
# Environment settings: reads, validates, and safely updates the local .env file.
# -----------------------------------------------------------------------------

import os
import tempfile
from dataclasses import dataclass
from pathlib import Path

from dotenv import dotenv_values

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = PROJECT_ROOT / ".env"
ENV_EXAMPLE_PATH = PROJECT_ROOT / ".env.example"


@dataclass(frozen=True)
class EnvSetting:
    name: str
    value: str
    is_secret: bool


def _setting_names(path: Path) -> list[str]:
    if not path.exists():
        return []
    return [
        line.split("=", 1)[0].strip()
        for line in path.read_text().splitlines()
        if line.strip() and not line.lstrip().startswith("#") and "=" in line
    ]


def load_settings() -> list[EnvSetting]:
    """Return settings from .env, supplemented by missing .env.example entries."""
    names = list(dict.fromkeys(_setting_names(ENV_PATH) + _setting_names(ENV_EXAMPLE_PATH)))
    current = dotenv_values(ENV_PATH) if ENV_PATH.exists() else {}
    examples = dotenv_values(ENV_EXAMPLE_PATH) if ENV_EXAMPLE_PATH.exists() else {}

    return [
        EnvSetting(
            name=name,
            value=str(current.get(name) if current.get(name) is not None else examples.get(name) or ""),
            is_secret=_is_secret(name),
        )
        for name in names
    ]


def _is_secret(name: str) -> bool:
    upper_name = name.upper()
    return any(marker in upper_name for marker in ("KEY", "TOKEN", "SECRET", "PASSWORD"))


def _serialize_value(value: str) -> str:
    """Quote a value so spaces, comments, quotes, and newlines survive a reload."""
    escaped = (
        value.replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\n", "\\n")
        .replace("\r", "\\r")
    )
    return f'"{escaped}"'


def validate_settings(values: dict[str, str]) -> dict[str, str]:
    """Normalize form values and return validation errors keyed by setting name."""
    errors: dict[str, str] = {}
    try:
        temperature = float(values.get("TEMPERATURE", ""))
        if not 0.0 <= temperature <= 2.0:
            errors["TEMPERATURE"] = "Must be between 0.0 and 2.0."
    except ValueError:
        errors["TEMPERATURE"] = "Must be a number between 0.0 and 2.0."

    try:
        max_tokens = int(values.get("MAX_TOKENS", ""))
        if not 128 <= max_tokens <= 4096:
            errors["MAX_TOKENS"] = "Must be an integer between 128 and 4096."
    except ValueError:
        errors["MAX_TOKENS"] = "Must be an integer between 128 and 4096."

    return errors


def save_settings(values: dict[str, str]) -> None:
    """Update known assignments while preserving comments and unrelated content."""
    errors = validate_settings(values)
    if errors:
        raise ValueError("Cannot save invalid environment settings.")

    source_path = ENV_PATH if ENV_PATH.exists() else ENV_EXAMPLE_PATH
    lines = source_path.read_text().splitlines() if source_path.exists() else []
    remaining = dict(values)
    updated: list[str] = []

    for line in lines:
        stripped = line.lstrip()
        if stripped and not stripped.startswith("#") and "=" in line:
            name = line.split("=", 1)[0].strip()
            if name in remaining:
                updated.append(f"{name}={_serialize_value(remaining.pop(name))}")
                continue
        updated.append(line)

    if remaining:
        if updated and updated[-1]:
            updated.append("")
        updated.extend(
            f"{name}={_serialize_value(value)}" for name, value in remaining.items()
        )

    ENV_PATH.parent.mkdir(parents=True, exist_ok=True)
    file_descriptor, temporary_name = tempfile.mkstemp(
        dir=ENV_PATH.parent,
        prefix=".env.",
        text=True,
    )
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(file_descriptor, "w") as temporary_file:
            temporary_file.write("\n".join(updated) + "\n")
        temporary_path.replace(ENV_PATH)
    finally:
        temporary_path.unlink(missing_ok=True)

    for name, value in values.items():
        os.environ[name] = value
