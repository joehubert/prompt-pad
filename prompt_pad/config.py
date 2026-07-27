import os

from dotenv import load_dotenv

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


def default_temperature() -> float:
    return float(os.getenv("TEMPERATURE", "0.7"))


def default_max_tokens() -> int:
    return int(os.getenv("MAX_TOKENS", "1024"))


def default_system_prompt() -> str:
    return os.getenv("SYSTEM_PROMPT", "You are a helpful assistant. Be concise.")
