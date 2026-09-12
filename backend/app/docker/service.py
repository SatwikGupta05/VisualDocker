import os
import subprocess
import tempfile
import docker
from typing import Dict, Any, List

def get_docker_client():
    try:
        return docker.from_env()
    except Exception as e:
        return None

def deploy_stack(compose_yaml: str, files: List[Dict[str, str]] = None) -> Dict[str, Any]:
    temp_dir = tempfile.mkdtemp(prefix="docker_builder_")
    compose_path = os.path.join(temp_dir, "docker-compose.yml")

    with open(compose_path, "w", encoding="utf-8") as f:
        f.write(compose_yaml)

    # Write any additional generated configuration files (e.g., nginx.conf)
    if files:
        for item in files:
            if item.get("filename") and item.get("filename") != "docker-compose.yml":
                fpath = os.path.join(temp_dir, item["filename"])
                with open(fpath, "w", encoding="utf-8") as f:
                    f.write(item.get("content", ""))

    try:
        cmd = ["docker", "compose", "-f", compose_path, "up", "-d", "--force-recreate", "--remove-orphans"]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return {
            "success": True,
            "message": "Stack deployed successfully!",
            "output": result.stdout or result.stderr,
            "temp_dir": temp_dir
        }
    except subprocess.CalledProcessError as e:
        return {
            "success": False,
            "message": f"Deployment failed: {e.stderr or e.stdout or str(e)}",
            "output": e.stderr or e.stdout,
            "temp_dir": temp_dir
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Docker execution error: {str(e)}",
            "output": str(e),
            "temp_dir": temp_dir
        }

def stop_stack() -> Dict[str, Any]:
    client = get_docker_client()
    if not client:
        return {"success": False, "message": "Docker daemon unavailable."}

    stopped_count = 0
    try:
        containers = client.containers.list(all=True)
        for c in containers:
            # Stop any stack containers matching stack prefixes or active compose services
            if any(p in c.name.lower() for p in ["temp_stack", "stack", "visualdocker", "app"]) or c.status == "running":
                try:
                    c.stop(timeout=3)
                except Exception:
                    pass
                try:
                    c.remove(force=True)
                except Exception:
                    pass
                stopped_count += 1
        return {
            "success": True,
            "message": f"Stopped and cleaned {stopped_count} container(s)."
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to stop stack containers: {str(e)}"
        }

def get_stack_status() -> List[Dict[str, Any]]:
    client = get_docker_client()
    if not client:
        return []

    containers = []
    try:
        for c in client.containers.list(all=True):
            containers.append({
                "id": c.short_id,
                "name": c.name,
                "image": c.image.tags[0] if c.image.tags else c.image.short_id,
                "status": c.status,
                "created": c.attrs.get("Created", "")
            })
    except Exception:
        pass
    return containers

def get_container_logs(container_name_or_id: str) -> str:
    client = get_docker_client()
    if not client:
        return "Docker daemon unavailable."

    try:
        c = client.containers.get(container_name_or_id)
        return c.logs(tail=100).decode("utf-8", errors="replace")
    except Exception as e:
        return f"Error reading logs for {container_name_or_id}: {str(e)}"
