from typing import List
from app.models.graph import GraphData, ValidationResult

def validate_graph(graph: GraphData) -> ValidationResult:
    errors: List[str] = []
    warnings: List[str] = []

    container_nodes = [n for n in graph.nodes if n.type == "containerNode"]
    if not container_nodes:
        errors.append("Graph must contain at least one container node.")

    for node in container_nodes:
        label = getattr(node.data, "label", node.id)
        image = getattr(node.data, "image", None)
        if not image:
            errors.append(f"Container node '{label}' is missing an image specification.")

    # Check host port conflicts in graph
    used_host_ports = {}
    for node in graph.nodes:
        if node.type == "portNode":
            hp = getattr(node.data, "host_port", None)
            if hp:
                if hp in used_host_ports:
                    warnings.append(f"Host port {hp} is assigned to multiple port nodes. Engine will auto-shift collisions.")
                else:
                    used_host_ports[hp] = node.id

    return ValidationResult(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings
    )
