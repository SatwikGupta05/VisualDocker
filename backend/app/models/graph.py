from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class Position(BaseModel):
    x: float
    y: float

class NodeData(BaseModel):
    label: Optional[str] = "Service"
    image: Optional[str] = "python:3.11-slim"
    command: Optional[str] = None
    ports: Optional[List[str]] = Field(default_factory=list)
    environment: Optional[Dict[str, str]] = Field(default_factory=dict)
    env_vars: Optional[List[str]] = Field(default_factory=list)
    volumes: Optional[List[str]] = Field(default_factory=list)
    driver: Optional[str] = "bridge"
    key: Optional[str] = None
    value: Optional[str] = None
    host_port: Optional[str] = None
    container_port: Optional[str] = None
    host_path: Optional[str] = None
    container_path: Optional[str] = None

class Node(BaseModel):
    id: str
    type: str
    position: Position
    data: NodeData

class Edge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None

class GraphData(BaseModel):
    nodes: List[Node]
    edges: List[Edge]

class DeployRequest(BaseModel):
    graph: GraphData

class ValidationResult(BaseModel):
    valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
