from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.models.graph import GraphData, DeployRequest
from app.engine.validator import validate_graph
from app.engine.generator import generate_docker_compose, generate_files
from app.engine.ai_assistant import generate_ai_architecture, PromptRequest
from app.docker.service import deploy_stack, get_stack_status, get_container_logs

from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="VisualDocker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Visual Docker Infrastructure Builder API operational", "version": "1.0.0"}

@app.post("/api/validate")
def validate(graph: GraphData):
    res = validate_graph(graph)
    return res.dict()

@app.post("/api/generate")
def generate(graph: GraphData):
    val = validate_graph(graph)
    if not val.valid:
        raise HTTPException(status_code=400, detail={"message": "Invalid graph schema", "errors": val.errors})
    compose_yaml = generate_docker_compose(graph)
    files = generate_files(graph)
    return {"compose_yaml": compose_yaml, "files": files}

@app.post("/api/deployments/up")
def deploy_up(req: DeployRequest):
    val = validate_graph(req.graph)
    if not val.valid:
        raise HTTPException(status_code=400, detail={"message": "Graph validation failed", "errors": val.errors})
    yaml_str = generate_docker_compose(req.graph)
    files = generate_files(req.graph)
    res = deploy_stack(yaml_str, files)
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("message", "Deployment failed"))
    return res

@app.get("/api/deployments/status")
def status():
    containers = get_stack_status()
    return {"containers": containers}

@app.get("/api/deployments/logs/{container_id}")
def logs(container_id: str):
    log_text = get_container_logs(container_id)
    return {"logs": log_text}

@app.post("/api/ai/suggest")
def ai_suggest(req: PromptRequest):
    graph_suggestion = generate_ai_architecture(req.prompt)
    return graph_suggestion
