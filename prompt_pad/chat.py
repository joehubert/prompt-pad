# -----------------------------------------------------------------------------
# Chat execution: builds requests, handles streaming, and formats response stats.
# -----------------------------------------------------------------------------

import time
from collections.abc import Callable
from dataclasses import dataclass

from openai import OpenAI


@dataclass
class ChatResult:
    answer: str
    elapsed: float
    ttft: float | None
    completion_tokens: int | None
    total_tokens: int | None


def build_payload(system_prompt: str, messages: list[dict]) -> list[dict]:
    return [{"role": "system", "content": system_prompt}] + [
        {"role": m["role"], "content": m["content"]} for m in messages
    ]


def format_meta(
    provider: str,
    model: str,
    elapsed: float,
    ttft: float | None,
    completion_tokens: int | None,
    total_tokens: int | None,
) -> str:
    bits = [f"{provider} / {model}", f"{elapsed:.2f}s total"]
    if ttft is not None:
        bits.append(f"{ttft:.2f}s to first token")
    if completion_tokens is not None:
        bits.append(f"{completion_tokens} out tokens")
        if elapsed > 0:
            bits.append(f"{completion_tokens / elapsed:.0f} tok/s")
    if total_tokens is not None:
        bits.append(f"{total_tokens} total")
    return "  |  ".join(bits)


def run_chat(
    client: OpenAI,
    *,
    model: str,
    messages: list[dict],
    temperature: float,
    max_tokens: int,
    stream: bool,
    on_chunk: Callable[[str], None] | None = None,
) -> ChatResult:
    start = time.perf_counter()
    first_token_at = None
    usage = None

    if stream:
        chunks: list[str] = []
        stream_resp = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
            stream_options={"include_usage": True},
        )
        for event in stream_resp:
            if getattr(event, "usage", None):
                usage = event.usage
            if not event.choices:
                continue
            piece = event.choices[0].delta.content
            if piece:
                if first_token_at is None:
                    first_token_at = time.perf_counter()
                chunks.append(piece)
                if on_chunk:
                    on_chunk("".join(chunks))
        answer = "".join(chunks)
    else:
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        answer = resp.choices[0].message.content or ""
        usage = getattr(resp, "usage", None)

    elapsed = time.perf_counter() - start
    completion_tokens = getattr(usage, "completion_tokens", None) if usage else None
    total_tokens = getattr(usage, "total_tokens", None) if usage else None

    return ChatResult(
        answer=answer,
        elapsed=elapsed,
        ttft=(first_token_at - start) if first_token_at else None,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
    )


def stats_record(
    provider: str,
    model: str,
    result: ChatResult,
) -> dict:
    return {
        "provider": provider,
        "model": model,
        "seconds": round(result.elapsed, 2),
        "ttft": round(result.ttft, 2) if result.ttft is not None else None,
        "out_tokens": result.completion_tokens,
    }
