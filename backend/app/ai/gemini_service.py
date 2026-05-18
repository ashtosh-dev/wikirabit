import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai


class GeminiService:
    def __init__(self):
        project_root = Path(__file__).resolve().parents[3]

        load_dotenv(project_root / ".env")
        load_dotenv(project_root / "backend" / ".env")

        self.api_key = os.getenv("GEMINI_API_KEY")

        self.model_candidates = [
            os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
            "gemini-2.0-flash",
            "gemini-2.5-flash",
            "gemini-2.0-flash-lite",
        ]

        self.client = None

        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)

    def explain_connection(
        self,
        source: str,
        target: str,
        path: list[str],
    ):
        if not self.api_key or self.client is None:
            return {
                "explanation": None,
                "message": "Gemini API key not found. Add GEMINI_API_KEY to your .env file.",
            }

        if not path:
            return {
                "explanation": None,
                "message": "No path was provided, so there is nothing to explain.",
            }

        path_text = " → ".join(path)

        prompt = f"""
You are explaining a Wikipedia knowledge graph connection.

Source topic: {source}
Target topic: {target}

Shortest path:
{path_text}

Write a clear, interesting explanation of why these topics are connected.

Rules:
- Keep it technically honest.
- Do not invent facts beyond what the path suggests.
- Explain the connection step by step.
- Make it fun for a student project demo.
- Keep it under 180 words.
"""

        errors = []

        for model_name in self.model_candidates:
            if not model_name:
                continue

            try:
                response = self.client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )

                return {
                    "explanation": response.text,
                    "message": None,
                    "model_used": model_name,
                }

            except Exception as error:
                errors.append(f"{model_name}: {error}")

        return {
            "explanation": None,
            "message": (
                "Gemini explanation failed for all model candidates. "
                "Try checking your API key and available Gemini models. "
                f"Errors: {' | '.join(errors)}"
            ),
        }