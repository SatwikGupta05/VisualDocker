import os
from typing import Dict, Any, List
from pydantic import BaseModel

class PromptRequest(BaseModel):
    prompt: str

def generate_ai_architecture(prompt: str) -> Dict[str, Any]:
    prompt_lower = prompt.lower()

    gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()

    if gemini_api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            system_prompt = (
                "You are a Docker Infrastructure Architect. Parse the user request and return ONLY a valid JSON "
                "object with 'nodes' and 'edges' arrays representing a Docker graph. Node types must be 'containerNode', "
                "'networkNode', 'volumeNode', 'portNode', or 'envNode'."
            )
            response = model.generate_content(f"{system_prompt}\nUser request: {prompt}")
            import json
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            parsed = json.loads(text.strip())
            if isinstance(parsed, dict) and "nodes" in parsed:
                return parsed
        except Exception:
            pass

    # Pre-built pattern templates based on prompt keywords (Fallback)
    if "fastapi" in prompt_lower or "python" in prompt_lower:
        return {
            "nodes": [
                {
                    "id": "c1",
                    "type": "containerNode",
                    "position": {"x": 250, "y": 150},
                    "data": {
                        "label": "fastapi-service",
                        "image": "python:3.11-slim",
                        "command": "tail -f /dev/null",
                        "ports": ["8000:8000"]
                    }
                },
                {
                    "id": "c2",
                    "type": "containerNode",
                    "position": {"x": 600, "y": 150},
                    "data": {
                        "label": "postgres-db",
                        "image": "postgres:15-alpine",
                        "environment": {"POSTGRES_PASSWORD": "secretpassword"}
                    }
                },
                {
                    "id": "p1",
                    "type": "portNode",
                    "position": {"x": 50, "y": 150},
                    "data": {"host_port": "8000", "container_port": "8000"}
                },
                {
                    "id": "n1",
                    "type": "networkNode",
                    "position": {"x": 425, "y": 350},
                    "data": {"label": "backend-net", "driver": "bridge"}
                }
            ],
            "edges": [
                {"id": "e1", "source": "p1", "target": "c1"},
                {"id": "e2", "source": "c2", "target": "c1"},
                {"id": "e3", "source": "c1", "target": "n1"},
                {"id": "e4", "source": "c2", "target": "n1"}
            ]
        }
    elif "node" in prompt_lower or "express" in prompt_lower or "react" in prompt_lower:
        return {
            "nodes": [
                {
                    "id": "c1",
                    "type": "containerNode",
                    "position": {"x": 250, "y": 150},
                    "data": {
                        "label": "node-api",
                        "image": "node:18-alpine",
                        "command": "tail -f /dev/null",
                        "ports": ["3000:3000"]
                    }
                },
                {
                    "id": "c2",
                    "type": "containerNode",
                    "position": {"x": 600, "y": 150},
                    "data": {
                        "label": "redis-cache",
                        "image": "redis:alpine"
                    }
                },
                {
                    "id": "n1",
                    "type": "networkNode",
                    "position": {"x": 425, "y": 350},
                    "data": {"label": "app-net", "driver": "bridge"}
                }
            ],
            "edges": [
                {"id": "e1", "source": "c2", "target": "c1"},
                {"id": "e2", "source": "c1", "target": "n1"},
                {"id": "e3", "source": "c2", "target": "n1"}
            ]
        }
    else:
        # Default web stack: Nginx + App + Postgres
        return {
            "nodes": [
                {
                    "id": "c1",
                    "type": "containerNode",
                    "position": {"x": 250, "y": 150},
                    "data": {
                        "label": "web-nginx",
                        "image": "nginx:alpine",
                        "ports": ["80:80"]
                    }
                },
                {
                    "id": "c2",
                    "type": "containerNode",
                    "position": {"x": 600, "y": 150},
                    "data": {
                        "label": "backend-app",
                        "image": "python:3.11-slim",
                        "command": "tail -f /dev/null"
                    }
                },
                {
                    "id": "p1",
                    "type": "portNode",
                    "position": {"x": 50, "y": 150},
                    "data": {"host_port": "80", "container_port": "80"}
                }
            ],
            "edges": [
                {"id": "e1", "source": "p1", "target": "c1"},
                {"id": "e2", "source": "c2", "target": "c1"}
            ]
        }
