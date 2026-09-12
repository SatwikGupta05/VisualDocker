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

EXPECTED_DB_PATHS = {
    "postgres": "/var/lib/postgresql/data",
    "postgresql": "/var/lib/postgresql/data",
    "mongodb": "/data/db",
    "mongo": "/data/db",
    "mysql": "/var/lib/mysql",
    "redis": "/data",
}

def auto_fix_and_validate_graph(parsed: Dict[str, Any], prompt: str = "") -> Dict[str, Any]:
    """
    Requirements Extraction, Deterministic Validation & Auto-Fixer Layer.
    - Resolves ports dynamically without hardcoding 8000.
    - Strips host_port exposure on internal services (Postgres, Mongo, Redis) unless explicitly requested in prompt.
    - Fixes database volume mount paths (Postgres -> /var/lib/postgresql/data, Mongo -> /data/db, MySQL -> /var/lib/mysql).
    - Enforces database persistence if database is present.
    - Resolves reverse proxy target ports from actual target node ports or image defaults.
    """
    nodes = parsed.get("nodes", [])
    edges = parsed.get("edges", [])
    prompt_lower = prompt.lower()

    validation_reports: List[Dict[str, str]] = []
    
    node_map = {n["id"]: n for n in nodes if isinstance(n, dict) and "id" in n}
    container_nodes = {n["id"]: n for n in nodes if isinstance(n, dict) and n.get("type") == "containerNode"}
    network_nodes = {n["id"]: n for n in nodes if isinstance(n, dict) and n.get("type") == "networkNode"}
    volume_nodes = {n["id"]: n for n in nodes if isinstance(n, dict) and n.get("type") == "volumeNode"}
    port_nodes = {n["id"]: n for n in nodes if isinstance(n, dict) and n.get("type") == "portNode"}

    # Track container networks
    container_networks: Dict[str, set] = {c_id: set() for c_id in container_nodes}

    # Helper: Get default/configured container port without inventing fallback 8000
    def get_container_port(c_node: dict) -> int:
        data = c_node.get("data", {})
        ports = data.get("ports", [])
        if ports and isinstance(ports, list):
            first_p = str(ports[0])
            if ":" in first_p:
                return int(first_p.split(":")[-1])
            elif first_p.isdigit():
                return int(first_p)
        
        image = str(data.get("image", "")).lower()
        label = str(data.get("label", "")).lower()
        comb = f"{label} {image}"

        # 1. Check explicitly requested port in prompt for backend/api
        if "api" in comb or "backend" in comb:
            if "5000" in prompt_lower:
                return 5000
            if "8000" in prompt_lower:
                return 8000

        # 2. Known infrastructure service default port
        for srv, p in DEFAULT_PORTS.items():
            if srv in comb:
                return p
        
        return None

    # Extract all explicitly requested host ports from prompt
    import re
    explicit_requested_ports = set(re.findall(r'\b\d{4,5}\b|\b3000\b|\b5000\b|\b8000\b|\b80\b', prompt_lower))

    # Dedicated portNode Validation & Auto-Stripping Pass
    nodes_to_keep = []
    removed_port_ids = set()

    for node in nodes:
        if node.get("type") == "portNode":
            p_id = node["id"]
            p_data = node.get("data", {})
            h_port = str(p_data.get("host_port", "")).strip()
            c_port = str(p_data.get("container_port", "")).strip()

            # Find connected container
            conn_edges = [e for e in edges if e.get("source") == p_id or e.get("target") == p_id]
            target_c = None
            for ce in conn_edges:
                target_id = ce.get("target") if ce.get("source") == p_id else ce.get("source")
                if target_id in container_nodes:
                    target_c = container_nodes[target_id]
                    break

            # 1. Remove orphan portNode objects without connected containers
            if not target_c:
                removed_port_ids.add(p_id)
                validation_reports.append({
                    "level": "INFO",
                    "category": "PORT",
                    "message": f"[AUTO-FIXED] Removed orphan portNode '{p_id}' without connected service."
                })
                continue

            t_data = target_c.get("data", {})
            t_lbl = str(t_data.get("label", "")).lower()
            t_img = str(t_data.get("image", "")).lower()
            t_comb = f"{t_lbl} {t_img}"

            # 2. Remove host exposure on internal database/cache services unless requested
            if any(db in t_comb for db in INTERNAL_SERVICES):
                if not any(f"expose {db}" in prompt_lower or f"{db} port" in prompt_lower or f"{db} host" in prompt_lower or f"port {h_port}" in prompt_lower for db in [t_lbl, "postgres", "mongo", "redis", "mysql"]):
                    removed_port_ids.add(p_id)
                    validation_reports.append({
                        "level": "WARNING",
                        "category": "SECURITY",
                        "message": f"[AUTO-FIXED] Stripped unauthorized host port exposure ({h_port}:{c_port}) on internal service '{t_lbl}'."
                    })
                    continue

            # 3. Host Port Binding Validation Rule:
            # Container Port = Service Capability. Host Port Binding = Explicit User Requirement.
            # Only keep host portNode if h_port was explicitly requested in prompt, or if it is the designated Nginx/web entrypoint.
            is_entrypoint = ("nginx" in t_comb or "proxy" in t_comb or "traefik" in t_comb or "caddy" in t_comb)
            
            if explicit_requested_ports:
                if h_port not in explicit_requested_ports:
                    # If user requested explicit ports (e.g. 3000, 5000), unrequested ports (e.g. 8000) on non-entrypoint or backend services MUST be removed
                    if not (is_entrypoint and (h_port in ["80", "3000", "8080"])):
                        removed_port_ids.add(p_id)
                        validation_reports.append({
                            "level": "WARNING",
                            "category": "PORT",
                            "message": f"[AUTO-FIXED] Removed host portNode binding ({h_port}:{c_port}) for '{t_lbl}' because host exposure was not explicitly requested."
                        })
                        continue
            else:
                # If prompt did NOT explicitly request host port bindings, remove host portNodes from internal backend services
                if not is_entrypoint:
                    removed_port_ids.add(p_id)
                    validation_reports.append({
                        "level": "WARNING",
                        "category": "PORT",
                        "message": f"[AUTO-FIXED] Removed host portNode binding ({h_port}:{c_port}) for internal backend service '{t_lbl}'."
                    })
                    continue

        if node["id"] not in removed_port_ids:
            nodes_to_keep.append(node)

    nodes = nodes_to_keep
    node_map = {n["id"]: n for n in nodes if isinstance(n, dict) and "id" in n}

    # 2. Process & Sanitize Edges
    valid_edges = []
    seen_edge_keys = set()

    for idx, edge in enumerate(edges):
        if not isinstance(edge, dict):
            continue

        src = edge.get("source")
        tgt = edge.get("target")

        if not src or not tgt or src not in node_map or tgt not in node_map:
            continue
        if src in removed_port_ids or tgt in removed_port_ids:
            continue

        edge_type = edge.get("type", "service_dependency")
        edge_key = f"{src}->{tgt}:{edge_type}"
        if edge_key in seen_edge_keys:
            continue
        seen_edge_keys.add(edge_key)

        # Track network memberships
        if edge_type == "network_attachment":
            if src in container_networks and tgt in network_nodes:
                container_networks[src].add(tgt)
            elif tgt in container_networks and src in network_nodes:
                container_networks[tgt].add(src)

        valid_edge = {
            "id": edge.get("id") or f"e_{idx+1}",
            "source": src,
            "target": tgt,
            "type": edge_type
        }

        # Dynamically resolve target_port from the actual target container node
        tgt_node = container_nodes.get(tgt)
        if tgt_node:
            resolved_port = get_container_port(tgt_node)
            # Ensure target_port always equals the actual internal container port
            valid_edge["target_port"] = resolved_port or edge.get("target_port")

        if edge_type == "reverse_proxy":
            valid_edge["path"] = edge.get("path") or ("/api" if "api" in str(tgt).lower() or "backend" in str(tgt).lower() else "/")
            if "protocol" in edge:
                valid_edge["protocol"] = edge["protocol"]
            # Target port for reverse proxy MUST match the actual target container port
            if tgt_node:
                valid_edge["target_port"] = resolved_port or edge.get("target_port")

        if edge_type in ["database_connection", "cache_connection"]:
            if tgt_node:
                valid_edge["target_port"] = get_container_port(tgt_node)

        valid_edges.append(valid_edge)

    # 3. Database Persistence & Path Auto-Fixer
    for c_id, c_node in container_nodes.items():
        data = c_node.get("data", {})
        image = str(data.get("image", "")).lower()
        label = str(data.get("label", "")).lower()
        comb = f"{label} {image}"

        for db_name, expected_path in EXPECTED_DB_PATHS.items():
            if db_name in comb:
                # Find volume mount edge
                vol_edges = [e for e in valid_edges if (e["source"] == c_id or e["target"] == c_id) and e["type"] == "volume_mount"]
                if not vol_edges:
                    # Auto-create missing volume node & volume_mount edge if persistence requested or implied
                    v_id = f"vol_{db_name}_{c_id}"
                    v_name = f"{label}-data"
                    nodes.append({
                        "id": v_id,
                        "type": "volumeNode",
                        "position": {"x": c_node.get("position", {}).get("x", 400) + 300, "y": c_node.get("position", {}).get("y", 200)},
                        "data": {"label": v_name, "volume_name": v_name, "container_path": expected_path}
                    })
                    valid_edges.append({
                        "id": f"e_v_autofix_{c_id}",
                        "source": c_id,
                        "target": v_id,
                        "type": "volume_mount",
                        "container_path": expected_path
                    })
                    validation_reports.append({
                        "level": "INFO",
                        "category": "STORAGE",
                        "message": f"[AUTO-FIXED] Added volume mount '{v_name}' ({expected_path}) for database service '{label}'."
                    })
                else:
                    # Enforce exact correct container_path
                    for ve in vol_edges:
                        ve["container_path"] = expected_path
                        vol_target = node_map.get(ve["target"]) or node_map.get(ve["source"])
                        if vol_target and "data" in vol_target:
                            vol_target["data"]["container_path"] = expected_path

    parsed["nodes"] = nodes
    parsed["edges"] = valid_edges
    parsed["validation_reports"] = validation_reports
    return parsed

def validate_graph(parsed: Dict[str, Any], prompt: str = "") -> Dict[str, Any]:
    return auto_fix_and_validate_graph(parsed, prompt)


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
PORT RULES & BINDING CONSTRAINTS
--------------------------------------------------

- Never create a portNode unless host exposure is explicitly requested by the user or required by reverse proxy entrypoint architecture.
- Never invent a host port binding.
- Never use 8000 as a default port.
- 8000 is valid ONLY when the user explicitly requests port 8000 or the service configuration explicitly specifies container port 8000.
- If the user specifies frontend port 3000, use 3000.
- If the user specifies backend/API port 5000, use 5000.
- Internal databases, caches, queues, and brokers must NOT have host port bindings unless explicitly requested.
- Do not create standalone/orphan portNode objects.

Interpret Docker port mappings as:
HOST_PORT:CONTAINER_PORT (e.g. 3000:80 means host_port=3000, container_port=80).

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

                # Apply deterministic graph validation and auto-fixer layer
                return validate_graph(parsed, prompt)

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
