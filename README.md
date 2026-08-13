# Prompt Pad

A chat app for talking to seven free-tier LLM providers through their OpenAI-compatible endpoints, with response timing, token stats, and a configuration page.

Supported providers: **Groq, OpenRouter, Cloudflare Workers AI, GitHub Models, NVIDIA NIM, Mistral, Cohere**. You only need API keys for the ones you actually want to use — the sidebar greys out anything unconfigured.

This repo currently has two implementations side by side:

- **Next.js / TypeScript** (`app/`, `core/`) — the current version, documented below.
- **Python / Streamlit** (`prompt_pad/`, `prompt_pad.py`, `pages/`) — the original version, kept for reference and slated for removal. Its setup instructions are in the "Legacy Python / Streamlit app" section at the bottom of this file.

Both read the same root-level `.env` file, so provider keys and defaults only need to be set once.

## Setup (Next.js)

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local env file from the template and fill in whichever keys you have:

   ```bash
   cp .env.example .env
   ```

   Each provider needs its own API key:

   | Provider | Env var(s) | Get a key at |
   |---|---|---|
   | Groq | `GROQ_API_KEY` | console.groq.com -> API Keys |
   | OpenRouter | `OPENROUTER_API_KEY` | openrouter.ai -> Keys |
   | Cloudflare Workers AI | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | dash.cloudflare.com -> AI > Workers AI |
   | GitHub Models | `GITHUB_TOKEN` | github.com/settings/tokens (fine-grained PAT with `models:read`) |
   | NVIDIA NIM | `NVIDIA_API_KEY` | build.nvidia.com -> any model card |
   | Mistral | `MISTRAL_API_KEY` | console.mistral.ai -> API Keys (needs phone verification) |
   | Cohere | `COHERE_API_KEY` | dashboard.cohere.com -> API Keys (free trial key) |

   You can also set `TEMPERATURE`, `MAX_TOKENS`, and `SYSTEM_PROMPT` in `.env` to change the app's defaults.

   `.env` is already listed in `.gitignore` — never commit it.

3. Run the app:

   ```bash
   npm run dev
   ```

   This starts the app at `http://localhost:3000`.

## Usage

- **Provider / Model** — pick a provider in the sidebar, then a model. Providers without a configured key are shown with a "(no key)" suffix. For OpenRouter, click **Refresh free models** to pull the current list of `:free` models from OpenRouter's public catalog (this happens automatically the first time you switch to OpenRouter).
- **Custom model ID** — type an ID into the override box to use a model not in the preset list.
- **Temperature / Max tokens / System prompt** — adjust generation settings per request.
- **Configuration page** (`/config`) — persist provider credentials and the default temperature, max tokens, and system prompt to `.env`. Inference-page controls remain session-only.
- **Stream responses** — toggle streaming vs. waiting for the full response.
- **Chat** — type in the input box at the bottom to start a conversation. Each assistant reply shows timing (total time, time to first token, tokens/sec) below the message.
- **Clear conversation** — resets the chat history and stats.
- **Run history** — expand the panel at the bottom of the page to see a table of stats for every request made this session.

## Project structure

- [app/page.tsx](app/page.tsx) — chat page (sidebar, chat history, run history)
- [app/config/page.tsx](app/config/page.tsx) — configuration page
- [app/_components/](app/_components/) — Sidebar, ChatHistory, ChatInput, RunHistoryTable, NavBar
- [app/api/providers/route.ts](app/api/providers/route.ts) — provider registry + configured-key status + defaults
- [app/api/chat/route.ts](app/api/chat/route.ts) — streaming chat request/response handling and stats
- [app/api/openrouter-models/route.ts](app/api/openrouter-models/route.ts) — OpenRouter free-model catalog proxy
- [app/api/config/route.ts](app/api/config/route.ts) — reads/writes persistent `.env` settings
- [core/providers.ts](core/providers.ts) — provider registry and default settings loaded from `.env`
- [core/env-settings.ts](core/env-settings.ts) — `.env` loading, validation, and persistence
- [core/format.ts](core/format.ts) — shared stats formatting (client + server)
- [core/types.ts](core/types.ts) — shared TypeScript types

---

## Legacy Python / Streamlit app

The original Streamlit implementation is still present in this repo (`prompt_pad/`, `prompt_pad.py`, `pages/`) and will be removed once the Next.js version has fully replaced it in day-to-day use. Its setup instructions:

### Setup

1. Install dependencies:

   ```bash
   pip install streamlit openai python-dotenv httpx
   ```

2. Create your local env file from the template and fill in whichever keys you have:

   ```bash
   cp .env.example .env
   ```

   Each provider needs its own API key:

   | Provider | Env var(s) | Get a key at |
   |---|---|---|
   | Groq | `GROQ_API_KEY` | console.groq.com -> API Keys |
   | OpenRouter | `OPENROUTER_API_KEY` | openrouter.ai -> Keys |
   | Cloudflare Workers AI | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | dash.cloudflare.com -> AI > Workers AI |
   | GitHub Models | `GITHUB_TOKEN` | github.com/settings/tokens (fine-grained PAT with `models:read`) |
   | NVIDIA NIM | `NVIDIA_API_KEY` | build.nvidia.com -> any model card |
   | Mistral | `MISTRAL_API_KEY` | console.mistral.ai -> API Keys (needs phone verification) |
   | Cohere | `COHERE_API_KEY` | dashboard.cohere.com -> API Keys (free trial key) |

   You can also set `TEMPERATURE`, `MAX_TOKENS`, and `SYSTEM_PROMPT` in `.env` to change the app's defaults.

   `.env` is already listed in `.gitignore` — never commit it.

3. Run the app:

   ```bash
   streamlit run prompt_pad.py
   ```

   This opens the app in your browser (usually at `http://localhost:8501`).

### Usage

- **Provider / Model** — pick a provider in the sidebar, then a model. Providers without a configured key are shown greyed out. For OpenRouter, click **Refresh free models** to pull the current list of `:free` models from OpenRouter's public catalog.
- **Custom model ID** — type an ID into the override box to use a model not in the preset list.
- **Temperature / Max tokens / System prompt** — adjust generation settings per request.
- **Configuration page** — persist provider credentials and the default temperature, max tokens, and system prompt to `.env`. Inference-page controls remain session-only.
- **Stream responses** — toggle streaming vs. waiting for the full response.
- **Chat** — type in the input box at the bottom to start a conversation. Each assistant reply shows timing (total time, time to first token, tokens/sec) below the message.
- **Clear conversation** — resets the chat history and stats.
- **Run history** — expand the panel at the bottom of the page to see a table of stats for every request made this session.

### Project structure

- [prompt_pad.py](prompt_pad.py) — entry point, run with `streamlit run`
- [prompt_pad/config.py](prompt_pad/config.py) — provider registry and default settings loaded from `.env`
- [prompt_pad/env_settings.py](prompt_pad/env_settings.py) — `.env` loading, validation, and persistence
- [prompt_pad/config_page.py](prompt_pad/config_page.py) — configuration-page UI
- [prompt_pad/providers.py](prompt_pad/providers.py) — provider configuration checks and OpenAI client construction
- [prompt_pad/chat.py](prompt_pad/chat.py) — chat request/response handling, streaming, and stats
- [prompt_pad/app.py](prompt_pad/app.py) — Streamlit UI (sidebar, chat history, input handling)
- [pages/2_Configuration.py](pages/2_Configuration.py) — Streamlit configuration-page entry point
