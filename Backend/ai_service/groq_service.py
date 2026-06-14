import os
from pathlib import Path

from dotenv import load_dotenv
from groq import Groq


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

MODEL = "llama-3.1-8b-instant"
JSON_RESPONSE_FORMAT = {"type": "json_object"}
MAX_JSON_COMPLETION_TOKENS = 4096

api_key = os.getenv("GROQ_API_KEY")
client = None


def get_client():
    global client
    if client is None:
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in Backend/.env")
        client = Groq(api_key=api_key)
    return client


def call_groq_json(prompt, system_prompt, temperature=0.1, max_completion_tokens=None):
    response = get_client().chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        temperature=temperature,
        response_format=JSON_RESPONSE_FORMAT,
        max_completion_tokens=max_completion_tokens or MAX_JSON_COMPLETION_TOKENS,
    )
    return response.choices[0].message.content


def call_groq_text(prompt, system_prompt, temperature=0.2):
    response = get_client().chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        temperature=temperature,
    )
    return response.choices[0].message.content.strip()
