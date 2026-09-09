import os
import json
from typing import Dict, Any, List
from pydantic import BaseModel

class PromptRequest(BaseModel):
    prompt: str

DEFAULT_PORTS = {
    "nginx": 80,
    "postgres": 5432,
    "postgresql": 5432,
    "redis": 6379,
    "mysql": 3306,
    "mongodb": 27017,
    "mongo": 27017,
    "rabbitmq": 5672,
    "kafka": 9092,
    "elasticsearch": 9200,
    "http": 80,
    "https": 443,
}

INTERNAL_SERVICES = {
    "postgres", "postgresql", "redis", "mysql", "mongodb", "mongo", "rabbitmq", "kafka", "elasticsearch"
}

def validate_graph(parsed: Dict[str, Any]) -> Dict[str, Any]:
    """
    Comprehensive Deterministic Graph Rules & Validation Engine.
    Enforces technical consistency, default ports, network sharing, volume paths,
    host exposure safety, and outputs structured validation reports (errors, warnings, recommendations).
    """
    nodes = parsed.get("nodes", [])
    edges = parsed.get("edges", [])

    validation_reports: List[Dict[str, str]] = []
    
    node_map = {n["id"]: n for n in nodes if isinstance(n, dict) and "id" in n}
    container_nodes = {n["id"]: n for n in nodes if isinstance(n, dict) and n.get("type") == "containerNode"}
    network_nodes = {n["id"]: n for n in nodes if isinstance(n, dict) and n.get("type") == "networkNode"}
    volume_nodes = {n["id"]: n for n in nodes if isinstance(n, dict) and n.get("type") == "volumeNode"}
    port_nodes = {n["id"]: n for n in nodes if isinstance(n, dict) and n.get("type") == "portNode"}

    # Track network attachments per container
    container_networks: Dict[str, set] = {c_id: set() for c_id in container_nodes}

    # 1. Edge reference & Duplicate Validation
    valid_edges = []
    seen_edge_keys = set()

    for idx, edge in enumerate(edges):
        if not isinstance(edge, dict):
            continue

        src = edge.get("source")
        tgt = edge.get("target")

        # 27. Invalid edge references
        if not src or not tgt or src not in node_map or tgt not in node_map:
            validation_reports.append({
                "level": "ERROR",
                "category": "GRAPH",
                "message": f"Edge '{edge.get('id', idx)}' references a non-existent node ('{src}' -> '{tgt}')."
            })
            continue

        # 26. Duplicate relationships
        edge_key = f"{src}->{tgt}:{edge.get('type', 'service_dependency')}"
        if edge_key in seen_edge_keys:
            continue
        seen_edge_keys.add(edge_key)

        edge_type = edge.get("type", "service_dependency")

        # Track network memberships
        if edge_type == "network_attachment":
            if src in container_networks and tgt in network_nodes:
                container_networks[src].add(tgt)
            elif tgt in container_networks and src in network_nodes:
                container_networks[tgt].add(src)

        # 21. Database/cache shouldn't normally be reverse-proxy targets
        if edge_type == "reverse_proxy":
            target_node = node_map.get(tgt, {})
            target_img = target_node.get("data", {}).get("image", "").lower()
            target_lbl = target_node.get("data", {}).get("label", "").lower()
            if any(db in target_img or db in target_lbl for db in ["postgres", "redis", "mysql", "mongo"]):
                validation_reports.append({
                    "level": "WARNING",
                    "category": "SERVICE",
                    "message": f"Reverse proxy targets database/cache service '{target_lbl or tgt}' directly."
                })

        valid_edge = {
            "id": edge.get("id") or f"e_{idx+1}",
            "source": src,
            "target": tgt,
            "type": edge_type
        }

        # 15. Reverse proxy target port preservation
        if "protocol" in edge:
            valid_edge["protocol"] = edge["protocol"]
        if "target_port" in edge:
            valid_edge["target_port"] = edge["target_port"]
        if "path" in edge:
            valid_edge["path"] = edge["path"]
        elif edge_type == "reverse_proxy" and "path" not in valid_edge:
            valid_edge["path"] = "/"

        valid_edges.append(valid_edge)

    # 8. Port conflicts & Host exposure safety
    used_host_ports: Dict[str, str] = {}
    for p_id, p_node in port_nodes.items():
        data = p_node.get("data", {})
        host_port = str(data.get("host_port", "")).strip()
        if host_port:
            if host_port in used_host_ports:
                validation_reports.append({
                    "level": "ERROR",
                    "category": "PORT",
                    "message": f"Host port conflict: Port {host_port} is bound to multiple entrypoints."
                })
            else:
                used_host_ports[host_port] = p_id

    # Validate Container Specs
    for c_id, c_node in container_nodes.items():
        data = c_node.get("data", {})
        image = str(data.get("image", "")).lower()
        label = str(data.get("label", "")).lower()
        cmd = str(data.get("command", "")).lower()

        # 23. tail -f /dev/null warning on real servers
        if "tail -f /dev/null" in cmd and any(srv in image or srv in label for srv in ["postgres", "nginx", "redis", "mysql"]):
            validation_reports.append({
                "level": "WARNING",
                "category": "APPLICATION",
                "message": f"Service '{label}' overrides default process with 'tail -f /dev/null'. Service may not start properly."
            })

        # 22. Runtime image vs application code warning
        if any(rt in image for rt in ["node:20", "python:3.11", "express"]) and "build" not in data and not data.get("app_context"):
            validation_reports.append({
                "level": "RECOMMENDATION",
                "category": "APPLICATION",
                "message": f"Service '{label}' uses runtime image '{image}' without explicitly defined build context."
            })

        # 10. Database persistence & volume path check
        if any(db in image or db in label for db in ["postgres", "mysql", "mongo"]):
            vol_edges = [e for e in valid_edges if (e["source"] == c_id or e["target"] == c_id) and e["type"] == "volume_mount"]
            if not vol_edges:
                validation_reports.append({
                    "level": "WARNING",
                    "category": "STORAGE",
                    "message": f"Database service '{label}' has no persistent volume mounted. Data may be lost on container restart."
                })
            else:
                for ve in vol_edges:
                    vol_target = node_map.get(ve["target"]) or node_map.get(ve["source"])
                    c_path = (ve.get("container_path") or (vol_target.get("data", {}) if vol_target else {}).get("container_path") or "").lower()
                    if "postgres" in image or "postgres" in label:
                        if c_path and c_path != "/var/lib/postgresql/data":
                            validation_reports.append({
                                "level": "WARNING",
                                "category": "STORAGE",
                                "message": f"PostgreSQL data path '{c_path}' may be non-standard. Expected '/var/lib/postgresql/data'."
                            })

            # 25. Database health check recommendation
            validation_reports.append({
                "level": "RECOMMENDATION",
                "category": "SERVICE",
                "message": f"Consider adding a health check condition for database service '{label}'."
            })

    # Validate Specific Edge Routing & Dependencies
    for edge in valid_edges:
        edge_type = edge.get("type")
        src_node = node_map.get(edge["source"], {})
        tgt_node = node_map.get(edge["target"], {})
        src_label = src_node.get("data", {}).get("label", "").lower()
        tgt_label = tgt_node.get("data", {}).get("label", "").lower()

        # 3. Nginx -> API reverse proxy /api metadata
        if edge_type == "reverse_proxy" and ("api" in tgt_label or "backend" in tgt_label):
            if not edge.get("path") or edge.get("path") == "/":
                edge["path"] = "/api"
            if not edge.get("target_port"):
                edge["target_port"] = 8000

        # 4. Internal target ports
        if edge_type == "database_connection" and not edge.get("target_port"):
            edge["target_port"] = 5432
        if edge_type == "cache_connection" and not edge.get("target_port"):
            edge["target_port"] = 6379

        # 5. Unnecessary direct API -> Worker connection
        if ("api" in src_label or "backend" in src_label) and "worker" in tgt_label and edge_type == "service_dependency":
            validation_reports.append({
                "level": "WARNING",
                "category": "ARCHITECTURE",
                "message": f"Direct connection from '{src_label}' to '{tgt_label}' detected. Jobs should be queued through Redis/broker."
            })

    # 11 & 14. Shared Network Communication Validation
    for edge in valid_edges:
        if edge["type"] in ["service_dependency", "database_connection", "cache_connection", "reverse_proxy"]:
            src = edge["source"]
            tgt = edge["target"]
            if src in container_nodes and tgt in container_nodes:
                src_nets = container_networks.get(src, set())
                tgt_nets = container_networks.get(tgt, set())
                # If networks are defined on containers but none are shared
                if src_nets and tgt_nets and not (src_nets & tgt_nets):
                    validation_reports.append({
                        "level": "ERROR",
                        "category": "NETWORK",
                        "message": f"Services '{node_map[src].get('data', {}).get('label')}' and '{node_map[tgt].get('data', {}).get('label')}' have no common Docker network and cannot communicate."
                    })

    # 29. Host Exposure Security Check
    for edge in valid_edges:
        if edge["type"] == "host_port":
            tgt = edge["target"]
            if tgt in container_nodes:
                data = container_nodes[tgt].get("data", {})
                image = str(data.get("image", "")).lower()
                label = str(data.get("label", "")).lower()
                if any(srv in image or srv in label for srv in INTERNAL_SERVICES):
                    validation_reports.append({
                        "level": "WARNING",
                        "category": "SECURITY",
                        "message": f"Internal database/cache service '{label}' is directly exposed to host."
                    })

    parsed["nodes"] = nodes
    parsed["edges"] = valid_edges
    parsed["validation_reports"] = validation_reports
    return parsed


def generate_ai_architecture(prompt: str) -> Dict[str, Any]:
    prompt_lower = prompt.lower()
    gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()

    if gemini_api_key:
        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=gemini_api_key)

            system_instruction = """
You are an expert Docker, Docker Compose, networking, and microservices architect.

Your task is to convert the user's natural-language infrastructure description into a precise React Flow infrastructure graph.

The graph represents infrastructure topology and relationships. Do not invent relationships that are not explicitly stated or logically required by the user's description.

OUTPUT FORMAT:

{
  "nodes": [
    {
      "id": "unique_id",
      "type": "containerNode",
      "position": {"x": 0, "y": 0},
      "data": {
        "label": "service-name",
        "image": "docker-image",
        "command": "optional command",
        "ports": [],
        "environment": {},
        "restart": "optional"
      }
    }
  ],
  "edges": [
    {
      "id": "unique_edge_id",
      "source": "source_node_id",
      "target": "target_node_id",
      "type": "relationship_type"
    }
  ]
}

ALLOWED NODE TYPES:
- containerNode
- networkNode
- volumeNode
- portNode
- envNode

--------------------------------------------------
ARCHITECTURE UNDERSTANDING
--------------------------------------------------

First understand the architecture described by the user.

Identify:
- services and containers
- networks
- persistent volumes
- host port mappings
- environment/configuration
- service-to-service communication
- reverse proxies and routing
- databases
- caches
- queues
- dependencies
- other explicitly described infrastructure relationships

Do not assume a fixed architecture.

Do not automatically connect:
- frontend to backend
- backend to database
- services to each other
- every container to every network

Only create relationships that are explicitly requested or logically required.

--------------------------------------------------
EDGE SEMANTICS
--------------------------------------------------

Every edge MUST describe the meaning of the relationship.

Use these edge types when applicable:

1. network_attachment
A container is attached to a Docker network.

2. volume_mount
A container mounts persistent storage.

3. host_port
A host port is mapped to a container port.

4. reverse_proxy
A proxy/load balancer forwards traffic to another service.

5. service_dependency
One service directly depends on or communicates with another internal service.

6. database_connection
A service connects to a database.

7. cache_connection
A service connects to a cache.

8. queue_connection
A service communicates with a message broker or queue.

--------------------------------------------------
VALIDATION & LAYOUT
--------------------------------------------------
Arrange the graph clearly with 300-400px spacing.
Return ONLY valid JSON.
"""

            response = None
            for model_name in ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-2.5-flash', 'gemini-2.0-flash']:
                try:
                    chat = client.chats.create(
                        model=model_name,
                        config=types.GenerateContentConfig(
                            system_instruction=system_instruction,
                            response_mime_type="application/json"
                        )
                    )
                    response = chat.send_message(f"Generate Docker architecture graph JSON for prompt: {prompt}")
                    if response and response.text:
                        break
                except Exception as model_err:
                    print(f"[AI ENGINE] Model {model_name} failed: {model_err}")
                    continue

            if not response or not response.text:
                raise Exception("All Gemini model endpoints returned empty responses or 503 errors.")

            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]

            parsed = json.loads(text.strip())
            if isinstance(parsed, dict) and "nodes" in parsed:
                nodes = parsed.get("nodes", [])

                # Grid positioning
                for idx, node in enumerate(nodes):
                    if "position" not in node or not isinstance(node["position"], dict) or "x" not in node["position"] or "y" not in node["position"]:
                        node["position"] = {"x": 100 + (idx % 3) * 350, "y": 150 + (idx // 3) * 220}
                    if "data" not in node or not isinstance(node["data"], dict):
                        node["data"] = {"label": node.get("id", f"node_{idx}")}

                # Apply deterministic graph validation layer
                return validate_graph(parsed)

        except Exception as e:
            print(f"[AI ENGINE ERROR] Gemini API generation failed: {e}")
            pass

    # Fallback pre-built 6-container production architecture template
    fallback_graph = {
        "nodes": [
            {
                "id": "c_nginx",
                "type": "containerNode",
                "position": {"x": 50, "y": 150},
                "data": {"label": "nginx-proxy", "image": "nginx:alpine"}
            },
            {
                "id": "c_frontend",
                "type": "containerNode",
                "position": {"x": 400, "y": 50},
                "data": {"label": "react-frontend", "image": "node:20-alpine", "command": "npm run dev"}
            },
            {
                "id": "c_api",
                "type": "containerNode",
                "position": {"x": 400, "y": 250},
                "data": {"label": "node-api", "image": "node:20-alpine", "command": "npm start"}
            },
            {
                "id": "c_postgres",
                "type": "containerNode",
                "position": {"x": 750, "y": 150},
                "data": {"label": "postgres-db", "image": "postgres:16-alpine"}
            },
            {
                "id": "c_redis",
                "type": "containerNode",
                "position": {"x": 750, "y": 350},
                "data": {"label": "redis-cache", "image": "redis:7-alpine"}
            },
            {
                "id": "c_worker",
                "type": "containerNode",
                "position": {"x": 750, "y": 550},
                "data": {"label": "bg-worker", "image": "node:20-alpine", "command": "node worker.js"}
            },
            {
                "id": "net_frontend",
                "type": "networkNode",
                "position": {"x": 200, "y": 420},
                "data": {"label": "frontend-net", "driver": "bridge"}
            },
            {
                "id": "net_backend",
                "type": "networkNode",
                "position": {"x": 550, "y": 420},
                "data": {"label": "backend-net", "driver": "bridge"}
            },
            {
                "id": "vol_pgdata",
                "type": "volumeNode",
                "position": {"x": 1050, "y": 150},
                "data": {"label": "pg-data", "volume_name": "pg-data", "container_path": "/var/lib/postgresql/data"}
            },
            {
                "id": "port_entry",
                "type": "portNode",
                "position": {"x": 50, "y": 20},
                "data": {"label": "Port 3000:80", "host_port": "3000", "container_port": "80"}
            }
        ],
        "edges": [
            # Port mapping
            {"id": "e_p1", "source": "port_entry", "target": "c_nginx", "type": "host_port", "host_port": 3000, "container_port": 80},
            # Nginx Reverse Proxy Routing
            {"id": "e_r1", "source": "c_nginx", "target": "c_frontend", "type": "reverse_proxy", "protocol": "http", "path": "/", "target_port": 3000},
            {"id": "e_r2", "source": "c_nginx", "target": "c_api", "type": "reverse_proxy", "protocol": "http", "path": "/api", "target_port": 8000},
            # Service Connections & Queue Flow (API -> Redis -> Worker, API -> Postgres, Worker -> Postgres)
            {"id": "e_s1", "source": "c_api", "target": "c_postgres", "type": "database_connection", "protocol": "postgres", "target_port": 5432},
            {"id": "e_s2", "source": "c_api", "target": "c_redis", "type": "queue_connection", "protocol": "redis", "target_port": 6379},
            {"id": "e_s3", "source": "c_worker", "target": "c_redis", "type": "queue_connection", "protocol": "redis", "target_port": 6379},
            {"id": "e_s4", "source": "c_worker", "target": "c_postgres", "type": "database_connection", "protocol": "postgres", "target_port": 5432},
            # Volume mount
            {"id": "e_v1", "source": "c_postgres", "target": "vol_pgdata", "type": "volume_mount", "container_path": "/var/lib/postgresql/data"},
            # Frontend Network Attachments
            {"id": "e_n1", "source": "c_nginx", "target": "net_frontend", "type": "network_attachment"},
            {"id": "e_n2", "source": "c_frontend", "target": "net_frontend", "type": "network_attachment"},
            {"id": "e_n3", "source": "c_api", "target": "net_frontend", "type": "network_attachment"},
            # Backend Network Attachments
            {"id": "e_n4", "source": "c_api", "target": "net_backend", "type": "network_attachment"},
            {"id": "e_n5", "source": "c_postgres", "target": "net_backend", "type": "network_attachment"},
            {"id": "e_n6", "source": "c_redis", "target": "net_backend", "type": "network_attachment"},
            {"id": "e_n7", "source": "c_worker", "target": "net_backend", "type": "network_attachment"}
        ]
    }
    return validate_graph(fallback_graph)
