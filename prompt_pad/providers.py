import os

import httpx
from openai import OpenAI

from prompt_pad.config import CF_ACCOUNT, PROVIDERS


def is_provider_configured(provider_name: str) -> bool:
    cfg = PROVIDERS[provider_name]
    return bool(os.getenv(cfg["key_env"]))


def configured_providers() -> dict[str, bool]:
    return {name: is_provider_configured(name) for name in PROVIDERS}


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
