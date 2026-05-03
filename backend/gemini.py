"""
gemini.py — Google Gemini API ke saath chat karta hai
Normal response + Streaming response dono support karta hai
"""

import httpx
import json
from typing import AsyncGenerator

GEMINI_API_BASE = "https://generativeai.googleapis.com/v1beta"
GEMINI_MODEL    = "gemini-2.5-flash"


async def ask_gemini(prompt: str, api_key: str) -> str:
    """
    Gemini se complete response lo (non-streaming).

    Args:
        prompt:  Built prompt string
        api_key: Google AI Studio API key

    Returns:
        Gemini ka full response text
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"

    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "topP": 0.9,
            "maxOutputTokens": 1024,
        }
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(url, json=payload)

            if response.status_code == 400:
                raise ValueError("Invalid request. API key check karo ya prompt dekho.")
            elif response.status_code == 403:
                raise PermissionError("API key invalid hai ya quota khatam ho gaya.")
            elif response.status_code == 429:
                raise RuntimeError("Rate limit exceed ho gayi. Thodi der baad try karo.")

            response.raise_for_status()
            data = response.json()

            candidates = data.get("candidates", [])
            if not candidates:
                return "Gemini ne koi jawab nahi diya."

            parts = candidates[0].get("content", {}).get("parts", [])
            if not parts:
                return "Gemini ka response empty hai."

            return parts[0].get("text", "").strip()

        except httpx.ConnectError:
            raise ConnectionError("Gemini API se connect nahi ho saka. Internet check karo.")
        except httpx.TimeoutException:
            raise TimeoutError("Gemini ne jawab dene mein zyada waqt liya. Dobara try karo.")


async def ask_gemini_stream(prompt: str, api_key: str) -> AsyncGenerator[str, None]:
    """
    Gemini se streaming response lo — real-time typing effect ke liye.

    Yields:
        Response ke text tokens ek ek karke
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:streamGenerateContent?alt=sse&key={api_key}"

    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "topP": 0.9,
            "maxOutputTokens": 1024,
        }
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            async with client.stream("POST", url, json=payload) as response:

                if response.status_code == 403:
                    yield "[ERROR] Gemini API key invalid hai ya quota khatam ho gaya."
                    return
                elif response.status_code == 429:
                    yield "[ERROR] Rate limit exceed ho gayi. Thodi der baad try karo."
                    return

                response.raise_for_status()

                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line or not line.startswith("data: "):
                        continue

                    data_str = line[6:]  # Remove "data: " prefix
                    if data_str == "[DONE]":
                        break

                    try:
                        chunk = json.loads(data_str)
                        candidates = chunk.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts:
                                token = parts[0].get("text", "")
                                if token:
                                    yield token
                    except json.JSONDecodeError:
                        continue

        except httpx.ConnectError:
            yield "[ERROR] Gemini API se connect nahi ho saka. Internet check karo."
        except httpx.TimeoutException:
            yield "[ERROR] Timeout ho gaya. Dobara try karo."


async def validate_gemini_key(api_key: str) -> dict:
    """
    Gemini API key validate karo — ek simple test call se.

    Returns:
        {"valid": True/False, "message": "..."}
    """
    if not api_key or not api_key.startswith("AIza"):
        return {"valid": False, "message": "API key format galat hai. 'AIza' se shuru hona chahiye."}

    test_prompt = "Say 'OK' in one word."
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"

    payload = {
        "contents": [{"parts": [{"text": test_prompt}]}],
        "generationConfig": {"maxOutputTokens": 10}
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.post(url, json=payload)

            if response.status_code == 200:
                return {"valid": True, "message": "API key valid hai!"}
            elif response.status_code == 403:
                return {"valid": False, "message": "API key invalid hai ya access nahi mila."}
            elif response.status_code == 429:
                # Key is valid but quota exceeded — still usable
                return {"valid": True, "message": "Key valid hai lekin rate limit ho gayi."}
            else:
                return {"valid": False, "message": f"Unexpected error: {response.status_code}"}

        except Exception as e:
            return {"valid": False, "message": f"Connection error: {str(e)}"}