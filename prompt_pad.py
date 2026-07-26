"""
Free LLM Inference Playground
-----------------------------
Single Streamlit app that chats against seven free-tier providers through
their OpenAI-compatible endpoints.

Setup:
    pip install streamlit openai python-dotenv
    cp .env.example .env   # then fill in whichever keys you have
    streamlit run free_llm_chat.py

You only need keys for the providers you actually want to use. The sidebar
greys out anything that isn't configured.
"""

import os
import time

import httpx
import streamlit as st
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

CF_ACCOUNT = os.getenv("CLOUDFLARE_ACCOUNT_ID", "")

# Each provider: where to point the SDK, which env var holds the key,
# and a few known-good free models. Add your own to the lists freely.
PROVIDERS = {
    "Groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "key_env": "GROQ_API_KEY",
        "models": [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "openai/gpt-oss-120b",
        ],
        "note": "Fastest inference available on a free tier. LPU hardware.",
    },
    "OpenRouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "key_env": "OPENROUTER_API_KEY",
        "models": [
            "meta-llama/llama-3.3-70b-instruct:free",
            "deepseek/deepseek-chat-v3-0324:free",
            "google/gemini-2.0-flash-exp:free",
        ],
        "note": "Widest model selection. Free models end in ':free'.",
    },
    "Cloudflare Workers AI": {
        "base_url": f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/ai/v1",
        "key_env": "CLOUDFLARE_API_TOKEN",
        "models": [
            "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
            "@cf/meta/llama-3.1-8b-instruct",
            "@cf/mistral/mistral-7b-instruct-v0.1",
        ],
        "note": "Also needs CLOUDFLARE_ACCOUNT_ID in .env. Billed in 'neurons'.",
    },
    "GitHub Models": {
        "base_url": "https://models.github.ai/inference",
        "key_env": "GITHUB_TOKEN",
        "models": [
            "openai/gpt-4o-mini",
            "meta/Llama-3.3-70B-Instruct",
            "mistral-ai/Mistral-Nemo",
        ],
        "note": "Uses a fine-grained PAT with the models:read permission.",
    },
    "NVIDIA NIM": {
        "base_url": "https://integrate.api.nvidia.com/v1",
        "key_env": "NVIDIA_API_KEY",
        "models": [
            "meta/llama-3.3-70b-instruct",
            "nvidia/llama-3.1-nemotron-70b-instruct",
            "mistralai/mistral-small-24b-instruct",
        ],
        "note": "Credit-based free tier from build.nvidia.com.",
    },
    "Mistral": {
        "base_url": "https://api.mistral.ai/v1",
        "key_env": "MISTRAL_API_KEY",
        "models": [
            "mistral-small-latest",
            "open-mistral-nemo",
            "codestral-latest",
        ],
        "note": "Requires phone verification to activate the free tier.",
    },
    "Cohere": {
        "base_url": "https://api.cohere.ai/compatibility/v1",
        "key_env": "COHERE_API_KEY",
        "models": [
            "command-r-plus-08-2024",
            "command-r-08-2024",
            "command-r7b-12-2024",
        ],
        "note": "Trial key: ~20 calls/min, 1000/month.",
    },
}


def fetch_openrouter_free_models() -> list[str]:
    """Query OpenRouter's public models list and return the free-tier IDs.

    No API key needed for this endpoint - it's just a catalog listing.
    """
    resp = httpx.get("https://openrouter.ai/api/v1/models", timeout=15.0)
    resp.raise_for_status()
    data = resp.json().get("data", [])
    return sorted(m["id"] for m in data if m.get("id", "").endswith(":free"))


def get_client(provider_name: str) -> OpenAI:
    cfg = PROVIDERS[provider_name]
    key = os.getenv(cfg["key_env"])
    if not key:
        raise RuntimeError(f"{cfg['key_env']} not set in environment or .env")
    if provider_name == "Cloudflare Workers AI" and not CF_ACCOUNT:
        raise RuntimeError("CLOUDFLARE_ACCOUNT_ID not set in environment or .env")
    return OpenAI(base_url=cfg["base_url"], api_key=key, timeout=60.0)


st.set_page_config(page_title="Free LLM Playground", page_icon="*", layout="centered")
st.title("Free LLM Inference Playground")

with st.sidebar:
    st.header("Provider")

    configured = {
        name: bool(os.getenv(cfg["key_env"])) for name, cfg in PROVIDERS.items()
    }

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
        st.session_state.openrouter_models if provider == "OpenRouter" else cfg["models"]
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
                        st.session_state.openrouter_refreshed_at = time.strftime("%H:%M:%S")
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
    default_temperature = float(os.getenv("TEMPERATURE", "0.7"))
    default_max_tokens = int(os.getenv("MAX_TOKENS", "1024"))
    default_system_prompt = os.getenv(
        "SYSTEM_PROMPT", "You are a helpful assistant. Be concise."
    )
    temperature = st.slider("Temperature", 0.0, 2.0, default_temperature, 0.1)
    max_tokens = st.slider("Max tokens", 128, 4096, default_max_tokens, 128)
    system_prompt = st.text_area(
        "System prompt",
        value=default_system_prompt,
        height=90,
    )
    stream_mode = st.checkbox("Stream responses", value=True)

    st.divider()
    if st.button("Clear conversation", use_container_width=True):
        st.session_state.messages = []
        st.session_state.stats = []
        st.rerun()

if "messages" not in st.session_state:
    st.session_state.messages = []
if "stats" not in st.session_state:
    st.session_state.stats = []

for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])
        if msg.get("meta"):
            st.caption(msg["meta"])

prompt = st.chat_input("Ask something...")

if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    payload = [{"role": "system", "content": system_prompt}] + [
        {"role": m["role"], "content": m["content"]} for m in st.session_state.messages
    ]

    with st.chat_message("assistant"):
        try:
            client = get_client(provider)
            start = time.perf_counter()
            first_token_at = None
            usage = None

            if stream_mode:
                placeholder = st.empty()
                chunks = []
                stream = client.chat.completions.create(
                    model=model,
                    messages=payload,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True,
                    stream_options={"include_usage": True},
                )
                for event in stream:
                    if getattr(event, "usage", None):
                        usage = event.usage
                    if not event.choices:
                        continue
                    piece = event.choices[0].delta.content
                    if piece:
                        if first_token_at is None:
                            first_token_at = time.perf_counter()
                        chunks.append(piece)
                        placeholder.markdown("".join(chunks))
                answer = "".join(chunks)
            else:
                resp = client.chat.completions.create(
                    model=model,
                    messages=payload,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                answer = resp.choices[0].message.content
                usage = getattr(resp, "usage", None)
                st.markdown(answer)

            elapsed = time.perf_counter() - start

            bits = [f"{provider} / {model}", f"{elapsed:.2f}s total"]
            if first_token_at:
                bits.append(f"{(first_token_at - start):.2f}s to first token")
            if usage:
                out_tokens = getattr(usage, "completion_tokens", None)
                if out_tokens:
                    bits.append(f"{out_tokens} out tokens")
                    if elapsed > 0:
                        bits.append(f"{out_tokens / elapsed:.0f} tok/s")
                total = getattr(usage, "total_tokens", None)
                if total:
                    bits.append(f"{total} total")

            meta = "  |  ".join(bits)
            st.caption(meta)

            st.session_state.messages.append(
                {"role": "assistant", "content": answer, "meta": meta}
            )
            st.session_state.stats.append(
                {
                    "provider": provider,
                    "model": model,
                    "seconds": round(elapsed, 2),
                    "ttft": round(first_token_at - start, 2)
                    if first_token_at
                    else None,
                    "out_tokens": getattr(usage, "completion_tokens", None)
                    if usage
                    else None,
                }
            )

        except Exception as exc:
            st.error(f"{type(exc).__name__}: {exc}")
            # Roll back the user turn so a retry doesn't duplicate it.
            st.session_state.messages.pop()

if st.session_state.stats:
    with st.expander(f"Run history ({len(st.session_state.stats)})"):
        st.dataframe(st.session_state.stats, use_container_width=True)
