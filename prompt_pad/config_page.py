# -----------------------------------------------------------------------------
# Configuration UI: edits persistent provider credentials and inference defaults.
# -----------------------------------------------------------------------------

import streamlit as st

from prompt_pad.env_settings import load_settings, save_settings, validate_settings

DEFAULT_SETTINGS = {"TEMPERATURE", "MAX_TOKENS", "SYSTEM_PROMPT"}


def _render_setting(name: str, value: str, is_secret: bool) -> str:
    if name == "TEMPERATURE":
        return st.text_input(
            "Default temperature",
            value=value,
            help="Used when a new inference session starts. Valid range: 0.0–2.0.",
        )
    if name == "MAX_TOKENS":
        return st.text_input(
            "Default max tokens",
            value=value,
            help="Used when a new inference session starts. Valid range: 128–4096.",
        )
    if name == "SYSTEM_PROMPT":
        return st.text_area(
            "Default system prompt",
            value=value,
            height=120,
            help="Used when a new inference session starts.",
        )
    return st.text_input(
        name,
        value=value,
        type="password" if is_secret else "default",
    )


def main() -> None:
    st.set_page_config(
        page_title="Prompt Pad Configuration", page_icon="*", layout="centered"
    )
    st.title("Configuration")
    st.write(
        "Update persistent provider credentials and inference defaults. "
        "Changes are saved to `.env`; inference-page controls remain session-only."
    )

    settings = load_settings()
    with st.form("environment-settings"):
        st.subheader("Provider credentials")
        values = {
            setting.name: _render_setting(
                setting.name,
                setting.value,
                setting.is_secret,
            )
            for setting in settings
            if setting.name not in DEFAULT_SETTINGS
        }

        st.divider()
        st.subheader("Inference defaults")
        for setting in settings:
            if setting.name in DEFAULT_SETTINGS:
                values[setting.name] = _render_setting(
                    setting.name,
                    setting.value,
                    setting.is_secret,
                )

        submitted = st.form_submit_button("Save configuration", type="primary")

    if submitted:
        errors = validate_settings(values)
        if errors:
            for name, message in errors.items():
                st.error(f"{name}: {message}")
        else:
            try:
                save_settings(values)
            except OSError as exc:
                st.error(f"Could not save `.env`: {exc}")
            else:
                st.success(
                    "Configuration saved. New inference sessions will use these defaults."
                )
