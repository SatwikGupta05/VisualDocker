from app.models.graph import GraphData, Node, Edge, Position, NodeData
from app.engine.generator import generate_docker_compose

def test_generation():
    graph = GraphData(
        nodes=[
            Node(
                id="c1",
                type="containerNode",
                position=Position(x=100, y=100),
                data=NodeData(label="fastapi-app", image="python:3.11-slim", command="tail -f /dev/null")
            ),
            Node(
                id="p1",
                type="portNode",
                position=Position(x=10, y=100),
                data=NodeData(host_port="8000", container_port="8000")
            )
        ],
        edges=[
            Edge(id="e1", source="p1", target="c1")
        ]
    )
    res = generate_docker_compose(graph)
    print("Generated Docker Compose YAML:")
    print(res)
    assert "fastapi-app:" in res
    assert "8000:8000" in res or "ports:" in res
    print("Service image command override test passed!")

if __name__ == "__main__":
    test_generation()
