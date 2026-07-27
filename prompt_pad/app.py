# -----------------------------------------------------------------------------
# Streamlit UI: renders the sidebar, chat history, prompt input, and usage stats.
# -----------------------------------------------------------------------------

import time

import streamlit as st

from prompt_pad.chat import (
    build_payload,
    format_meta,
    run_chat,
    stats_record,
)
from prompt_pad.config import (
    PROVIDERS,
    default_max_tokens,
    default_system_prompt,
    default_temperature,
)
from prompt_pad.providers import (
    configured_providers,
    fetch_openrouter_free_models,
    get_client,
)


def _init_session_state() -> None:
    if "messages" not in st.session_state:
        st.session_state.messages = []
    if "stats" not in st.session_state:
        st.session_state.stats = []


def _render_sidebar() -> tuple[str, str, float, int, str, bool]:
    st.header("Provider")

    configured = configured_providers()

    def label(name: str) -> str:
        return name if configured[name] else f"{name}  (no key)"

    provider = st.selectbox(
        "Endpoint",
        list(PROVIDERS.keys()),
        format_func=label,
    )
    cfg = PROVIDERS[provider]

    if "openrouter_models" not in st.session_state:
        st.session_state.openrouter_models = list(PROVIDERS["OpenRouter"]["models"])

    model_options = (
        st.session_state.openrouter_models
        if provider == "OpenRouter"
        else cfg["models"]
    )

    if provider == "OpenRouter":
        if st.button("Refresh free models", use_container_width=True):
            with st.spinner("Fetching free models from OpenRouter..."):
                try:
                    fetched = fetch_openrouter_free_models()
                except Exception as exc:
                    st.error(f"Refresh failed: {exc}")
                else:
                    if fetched:
                        st.session_state.openrouter_models = fetched
                        model_options = fetched
                        st.session_state.openrouter_refreshed_at = time.strftime(
                            "%H:%M:%S"
                        )
                        st.success(f"Loaded {len(fetched)} free models.")
                    else:
                        st.warning("No free models found in the response.")
        if st.session_state.get("openrouter_refreshed_at"):
            st.caption(
                f"Last refreshed {st.session_state.openrouter_refreshed_at} "
                f"· {len(st.session_state.openrouter_models)} free models"
            )

    model = st.selectbox("Model", model_options)
    custom = st.text_input("...or type a model ID", placeholder="override")
    if custom.strip():
        model = custom.strip()

    st.caption(cfg["note"])

    if not configured[provider]:
        st.warning(f"Set `{cfg['key_env']}` in your .env to use this provider.")

    st.divider()
    temperature = st.slider("Temperature", 0.0, 2.0, default_temperature(), 0.1)
    max_tokens = st.slider("Max tokens", 128, 4096, default_max_tokens(), 128)
    system_prompt = st.text_area(
        "System prompt",
        value=default_system_prompt(),
        height=90,
    )
    stream_mode = st.checkbox("Stream responses", value=True)

    st.divider()
    if st.button("Clear conversation", use_container_width=True):
        st.session_state.messages = []
        st.session_state.stats = []
        st.rerun()

    return provider, model, temperature, max_tokens, system_prompt, stream_mode


def _render_history() -> None:
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
            if msg.get("meta"):
                st.caption(msg["meta"])


def _handle_prompt(
    prompt: str,
    provider: str,
    model: str,
    temperature: float,
    max_tokens: int,
    system_prompt: str,
    stream_mode: bool,
) -> None:
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    payload = build_payload(system_prompt, st.session_state.messages)

    with st.chat_message("assistant"):
        try:
            client = get_client(provider)
            placeholder = st.empty() if stream_mode else None

            def on_chunk(text: str) -> None:
                placeholder.markdown(text)

            result = run_chat(
                client,
                model=model,
                messages=payload,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=stream_mode,
                on_chunk=on_chunk if stream_mode else None,
            )

            if not stream_mode:
                st.markdown(result.answer)

            meta = format_meta(
                provider,
                model,
                result.elapsed,
                result.ttft,
                result.completion_tokens,
                result.total_tokens,
            )
            st.caption(meta)

            st.session_state.messages.append(
                {"role": "assistant", "content": result.answer, "meta": meta}
            )
            st.session_state.stats.append(stats_record(provider, model, result))

        except Exception as exc:
            st.error(f"{type(exc).__name__}: {exc}")
            # Roll back the user turn so a retry doesn't duplicate it.
            st.session_state.messages.pop()


def main() -> None:
    st.set_page_config(page_title="Free LLM Playground", page_icon="*", layout="centered")
    st.title("Free LLM Inference Playground")

    _init_session_state()

    with st.sidebar:
        provider, model, temperature, max_tokens, system_prompt, stream_mode = (
            _render_sidebar()
        )

    _render_history()

    prompt = st.chat_input("Ask something...")
    if prompt:
        _handle_prompt(
            prompt,
            provider,
            model,
            temperature,
            max_tokens,
            system_prompt,
            stream_mode,
        )

    if st.session_state.stats:
        with st.expander(f"Run history ({len(st.session_state.stats)})"):
            st.dataframe(st.session_state.stats, use_container_width=True)
