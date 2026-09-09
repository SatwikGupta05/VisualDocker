# Architecture & System Design Document

## VisualDocker

The **VisualDocker** platform is a modern visual modeling tool and runtime deployment manager designed for Docker containers, networks, volumes, and microservice topologies.

---

## 🏛️ System Architecture Overview

```mermaid
graph TD
    subgraph Frontend ["Frontend (Vite + React + React Flow)"]
        Canvas["React Flow Canvas"]
        Sidebar["Categorized Palette Sidebar"]
        Console["3-Tier Console Viewer"]
        Store["Zustand App Store"]
    end

    subgraph Backend ["Backend Engine (FastAPI + Python)"]
        API["FastAPI REST Endpoints"]
        Validator["Canvas Wiring & Port Validator"]
        Generator["Docker Compose Spec Generator"]
        AISuggest["Gemini AI Architecture Engine"]
        DockerService["Docker SDK Integration Service"]
    end

    subgraph Runtime ["Docker Engine Host"]
        DockerCompose["Docker Compose CLI"]
        Containers["Running Containers"]
    end

    Canvas --> Store
    Sidebar --> Canvas
    Store --> API
    API --> Validator
    API --> Generator
    API --> AISuggest
    API --> DockerService
    DockerService --> DockerCompose
    DockerCompose --> Containers
    Containers --> Console
```

---

## 🔄 Core Execution Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Canvas as React Flow UI
    participant Store as Zustand Store
    participant API as FastAPI Backend
    participant Generator as Compose Generator
    participant Docker as Docker SDK Engine

    User->>Canvas: Drag & Drop Nodes & Connect Edges
    Canvas->>Store: Update Node & Edge Graph State
    User->>Canvas: Click "Deploy Stack"
    Canvas->>API: POST /api/deployments/up (Graph Payload)
    API->>Generator: Convert Graph to docker-compose.yml
    Generator->>Generator: Run Host Port Auto-Shift Verification
    Generator-->>API: Return Generated Compose YAML & Spec
    API->>Docker: Execute docker compose up -d --force-recreate
    Docker-->>API: Stream Container Deployment Status & Logs
    API-->>Canvas: Return Success & Live Metrics
    Canvas->>Store: Update Local Engine Status & Terminal Log
```

---

## 💡 Key Subsystems

### 1. Canvas Connection & Handle Flow Rules
* **Directional Enforcement**:
  * **Target (Left)**: Inputs, configuration parameters, environment nodes, port mappings.
  * **Source (Right)**: Outputs, network interfaces, volume mounts, container dependencies.
* **Validation Engine**: Prevents invalid edge connections (e.g. connecting an environment node directly to a network node).

### 2. Docker Compose Generator & Auto-Port Shift
* Dynamically scans host network interfaces to verify if mapped host ports are free.
* Auto-allocates available host ports if collision is detected (e.g. `80:80` $\rightarrow$ `8080:80`).
* Supports command overrides (`tail -f /dev/null`) for persistent daemonized runtime containers.

### 3. Live 3-Tier Console & Telemetry
1. **Local Engine Status Table**: Displays container name, ID, status (`● RUNNING`, `OFFLINE`), memory usage, CPU %, and uptime.
2. **Deployment Output Console**: Structured timestamped log window powered by IBM Plex Mono typography.
3. **Interactive Terminal**: CLI interface for container inspection.
