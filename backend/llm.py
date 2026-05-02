"""
llm.py — Ollama ke saath LLaMA 2 call karta hai
Normal response + Streaming response dono support karta hai
"""

import httpx
import json
from typing import AsyncGenerator

OLLAMA_BASE_URL = "http://localhost:11434"
MODEL_NAME      = "llama2"


async def ask_llm(prompt: str) -> str:
    """
    Ollama se complete response lo (non-streaming).

    Args:
        prompt: Built prompt string

    Returns:
        LLM ka full response text
    """
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model":  MODEL_NAME,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,   # Zyada focused answer ke liye
                        "top_p":       0.9,
                        "num_predict": 512,   # Max tokens in response
                    }
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "").strip()

        except httpx.ConnectError:
            raise ConnectionError(
                "Ollama nahi chal raha. 'ollama serve' command run karo pehle."
            )
        except httpx.TimeoutException:
            raise TimeoutError("Ollama ne jawab dene mein zyada waqt liya. Dobara try karo.")


async def ask_llm_stream(prompt: str) -> AsyncGenerator[str, None]:
    """
    Ollama se streaming response lo — real-time typing effect ke liye.

    Yields:
        Response ke text tokens ek ek karke
    """
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            async with client.stream(
                "POST",
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model":  MODEL_NAME,
                    "prompt": prompt,
                    "stream": True,
                    "options": {
                        "temperature": 0.3,
                        "top_p":       0.9,
                        "num_predict": 512,
                    }
                }
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            chunk = json.loads(line)
                            token = chunk.get("response", "")
                            if token:
                                yield token
                            if chunk.get("done", False):
                                break
                        except json.JSONDecodeError:
                            continue

        except httpx.ConnectError:
            yield "[ERROR] Ollama nahi chal raha. 'ollama serve' run karo."
        except httpx.TimeoutException:
            yield "[ERROR] Timeout ho gaya. Dobara try karo."


async def check_ollama() -> dict:
    """Ollama chal raha hai ya nahi check karo."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            r = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            models = [m["name"] for m in r.json().get("models", [])]
            return {
                "running": True,
                "models":  models,
                "llama2_ready": any("llama2" in m for m in models)
            }
        except Exception:
            return {"running": False, "models": [], "llama2_ready": False}
