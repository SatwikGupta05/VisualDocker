import socket
import yaml
from typing import Dict, Any, List
from app.models.graph import GraphData

def is_host_port_in_use(port: int) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            return s.connect_ex(('127.0.0.1', port)) == 0
    except Exception:
        return False

def find_next_free_port(start_port: int) -> int:
    port = start_port
    while port < 65535:
        if not is_host_port_in_use(port):
            return port
        port += 1
    return start_port

def resolve_docker_image(raw_image: str, label: str) -> str:
    img = (raw_image or "").strip().lower()
    lbl = (label or "").strip().lower()

    # Known custom/local image names that don't exist on Docker Hub
    invalid_local_images = {
        "react-frontend", "react-frontend:latest", "frontend", "frontend:latest",
        "node-backend", "node-backend:latest", "backend", "backend:latest",
        "node-api", "node-api:latest", "express-backend", "express-backend:latest",
        "fastapi-service", "fastapi-service:latest", "python-backend", "python-backend:latest"
    }

    if img in invalid_local_images or not img:
        if "react" in img or "front" in img or "react" in lbl or "front" in lbl:
            return "node:22-alpine"
        elif "python" in img or "fastapi" in img or "python" in lbl or "fastapi" in lbl:
            return "python:3.11-slim"
        elif "nginx" in img or "nginx" in lbl:
            return "nginx:alpine"
        elif "postgres" in img or "postgres" in lbl:
            return "postgres:16-alpine"
        elif "redis" in img or "redis" in lbl:
            return "redis:latest"
        else:
            return "node:22-alpine"

    if ":" not in img and "/" not in img:
        known_official = {"nginx", "postgres", "redis", "node", "python", "ubuntu", "alpine", "mysql", "mongo", "mongodb", "rabbitmq", "memcached", "traefik"}
        if img not in known_official:
            if "react" in img or "front" in img:
                return "node:22-alpine"
            elif "python" in img or "fastapi" in img:
                return "python:3.11-slim"
            else:
                return f"{img}:latest"

    return raw_image

def generate_docker_compose(graph: GraphData) -> str:
    services: Dict[str, Any] = {}
    networks: Dict[str, Any] = {}
    volumes: Dict[str, Any] = {}

    container_nodes = [n for n in graph.nodes if n.type == "containerNode"]
    network_nodes = [n for n in graph.nodes if n.type == "networkNode"]
    volume_nodes = [n for n in graph.nodes if n.type == "volumeNode"]
    port_nodes = [n for n in graph.nodes if n.type == "portNode"]
    env_nodes = [n for n in graph.nodes if n.type == "envNode"]

    node_map = {n.id: n for n in graph.nodes}

    # Process networks
    for net in network_nodes:
        net_label = getattr(net.data, "label", net.id).lower().replace(" ", "_")
        driver = getattr(net.data, "driver", "bridge")
        networks[net_label] = {"driver": driver}

    # Process volumes
    for vol in volume_nodes:
        vol_label = getattr(vol.data, "label", vol.id).lower().replace(" ", "_")
        volumes[vol_label] = {}

    allocated_host_ports = set()

    for container in container_nodes:
        c_label = getattr(container.data, "label", container.id).lower().replace(" ", "_")
        raw_image = getattr(container.data, "image", "ubuntu:latest")
        c_image = resolve_docker_image(raw_image, c_label)
        c_cmd = getattr(container.data, "command", None)

        service_spec: Dict[str, Any] = {
            "image": c_image,
            "container_name": c_label,
        }

        # Command override handling
        if c_cmd:
            service_spec["command"] = c_cmd
        elif c_image and ("python" in c_image.lower() or "node" in c_image.lower() or "alpine" in c_image.lower() or "ubuntu" in c_image.lower()) and not any(db in c_image.lower() for db in ["postgres", "redis", "nginx", "mysql", "mongo"]):
            service_spec["command"] = "tail -f /dev/null"

        # Track ports, envs, volumes, nets, and depends_on
        # IMPORTANT: ports: entry in docker-compose is ONLY created when a portNode (host exposure) is connected
        c_ports: List[str] = []
        c_envs: Dict[str, str] = dict(getattr(container.data, "environment", {}) or {})
        c_vols: List[str] = list(getattr(container.data, "volumes", []) or [])
        c_nets: List[str] = []
        c_deps: List[str] = []

        # Process edges involving this container
        for edge in graph.edges:
            # 1. Connected Port Node (Host Port Binding ONLY)
            if (edge.target == container.id or edge.source == container.id) and edge.source in node_map and edge.target in node_map:
                p_id = edge.source if edge.target == container.id else edge.target
                if node_map[p_id].type == "portNode":
                    p_node = node_map[p_id]
                    hp_str = getattr(p_node.data, "host_port", None)
                    cp_str = getattr(p_node.data, "container_port", None)
                    if hp_str and cp_str:
                        try:
                            orig_hp = int(hp_str)
                            free_hp = find_next_free_port(orig_hp)
                            while free_hp in allocated_host_ports:
                                free_hp = find_next_free_port(free_hp + 1)
                            allocated_host_ports.add(free_hp)
                            port_entry = f"{free_hp}:{cp_str}"
                            if port_entry not in c_ports:
                                c_ports.append(port_entry)
                        except ValueError:
                            port_entry = f"{hp_str}:{cp_str}"
                            if port_entry not in c_ports:
                                c_ports.append(port_entry)

            # 2. Connected Env Node
            if edge.target == container.id and edge.source in node_map and node_map[edge.source].type == "envNode":
                e_node = node_map[edge.source]
                ek = getattr(e_node.data, "key", None)
                ev = getattr(e_node.data, "value", None)
                if ek and ev:
                    c_envs[ek] = ev

            # 3. Connected Network Node
            if (edge.source == container.id or edge.target == container.id) and edge.source in node_map and edge.target in node_map:
                other_id = edge.target if edge.source == container.id else edge.source
                if node_map[other_id].type == "networkNode":
                    net_name = getattr(node_map[other_id].data, "label", other_id).lower().replace(" ", "_")
                    if net_name not in c_nets:
                        c_nets.append(net_name)

            # 4. Connected Volume Node
            if (edge.source == container.id or edge.target == container.id) and edge.source in node_map and edge.target in node_map:
                other_id = edge.target if edge.source == container.id else edge.source
                if node_map[other_id].type == "volumeNode":
                    vol_name = getattr(node_map[other_id].data, "label", other_id).lower().replace(" ", "_")
                    vol_path = getattr(node_map[other_id].data, "container_path", getattr(edge, "container_path", "/var/lib/postgresql/data"))
                    mount_str = f"{vol_name}:{vol_path}"
                    if mount_str not in c_vols:
                        c_vols.append(mount_str)

            # 5. Connected Container Dependency (Reverse Proxy / DB Connection / Service Dependency Direction)
            # If edge.source == container.id and target is another container -> container DEPENDS ON target (e.g. Nginx -> API, API -> DB)
            if edge.source == container.id and edge.target in node_map and node_map[edge.target].type == "containerNode":
                edge_type = getattr(edge, "type", "service_dependency")
                if edge_type in ["reverse_proxy", "service_dependency", "database_connection", "cache_connection", "queue_connection"]:
                    dep_name = getattr(node_map[edge.target].data, "label", edge.target).lower().replace(" ", "_")
                    if dep_name != c_label and dep_name not in c_deps:
                        c_deps.append(dep_name)

        if "nginx" in c_image or "nginx" in c_label:
            nginx_mount = "./nginx.conf:/etc/nginx/conf.d/default.conf:ro"
            if nginx_mount not in c_vols:
                c_vols.append(nginx_mount)

        if c_ports:
            service_spec["ports"] = c_ports
        if c_envs:
            service_spec["environment"] = c_envs
        if c_vols:
            service_spec["volumes"] = c_vols
        if c_nets:
            service_spec["networks"] = c_nets
        if c_deps:
            service_spec["depends_on"] = c_deps

        services[c_label] = service_spec

    compose_dict: Dict[str, Any] = {"services": services}
    if networks:
        compose_dict["networks"] = networks
    if volumes:
        compose_dict["volumes"] = volumes

    return yaml.dump(compose_dict, sort_keys=False, default_flow_style=False)

def generate_files(graph: GraphData) -> List[Dict[str, str]]:
    files: List[Dict[str, str]] = []
    
    # 1. Main docker-compose.yml
    compose_yaml = generate_docker_compose(graph)
    files.append({
        "filename": "docker-compose.yml",
        "language": "yaml",
        "content": compose_yaml
    })

    node_map = {n.id: n for n in graph.nodes}
    container_nodes = [n for n in graph.nodes if n.type == "containerNode"]

    # 2. Conditional nginx.conf generation if Nginx container node is present
    for c in container_nodes:
        c_image = (getattr(c.data, "image", "") or "").lower()
        c_label = getattr(c.data, "label", c.id).lower().replace(" ", "_")

        if "nginx" in c_image or "nginx" in c_label:
            # Find all target services connected to Nginx via edges
            location_blocks = []
            seen_paths = set()

            for edge in graph.edges:
                if edge.source == c.id or edge.target == c.id:
                    other_id = edge.target if edge.source == c.id else edge.source
                    other_node = node_map.get(other_id)
                    if other_node and other_node.type == "containerNode" and not ("nginx" in (getattr(other_node.data, "image", "") or "").lower()):
                        target_name = getattr(other_node.data, "label", other_node.id).lower().replace(" ", "_")
                        
                        # 1. Read target_port from edge attribute if present
                        edge_target_port = getattr(edge, "target_port", None)
                        edge_path = getattr(edge, "path", None)

                        # 2. Determine target container's actual internal port if edge target_port is missing
                        if not edge_target_port:
                            # Check connected portNodes
                            for p_edge in graph.edges:
                                if p_edge.target == other_node.id or p_edge.source == other_node.id:
                                    p_id = p_edge.source if p_edge.target == other_node.id else p_edge.target
                                    p_node = node_map.get(p_id)
                                    if p_node and p_node.type == "portNode":
                                        cp = getattr(p_node.data, "container_port", None)
                                        if cp:
                                            edge_target_port = str(cp)
                                            break
                        
                        # 3. Fallback to service capability ports (Nginx 80, Postgres 5432, Redis 6379, Frontend 3000, API 8000/5000)
                        if not edge_target_port:
                            t_img = (getattr(other_node.data, "image", "") or "").lower()
                            t_lbl = target_name.lower()
                            if "front" in t_lbl or "react" in t_lbl or "vue" in t_lbl:
                                edge_target_port = "3000"
                            elif "api" in t_lbl or "back" in t_lbl or "express" in t_lbl or "node" in t_lbl or "python" in t_img or "uvicorn" in t_img:
                                edge_target_port = "5000" if "5000" in t_lbl else "8000"
                            else:
                                edge_target_port = "80"

                        # Determine location routing path
                        path = edge_path or ("/api" if "api" in target_name or "back" in target_name else "/")
                        if path not in seen_paths:
                            seen_paths.add(path)
                            if path == "/":
                                location_blocks.append(f"""    location / {{
        proxy_pass http://{target_name}:{edge_target_port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}""")
                            else:
                                location_blocks.append(f"""    location {path}/ {{
        proxy_pass http://{target_name}:{edge_target_port}/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}""")

            if not location_blocks:
                location_blocks.append("""    location / {
        proxy_pass http://backend-api:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }""")

            locations_str = "\n\n".join(location_blocks)
            nginx_conf_content = f"""server {{
    listen 80;
    server_name localhost;

{locations_str}
}}
"""
            files.append({
                "filename": "nginx.conf",
                "language": "nginx",
                "content": nginx_conf_content
            })
            break

    return files

