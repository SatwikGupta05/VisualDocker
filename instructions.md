# VisualDocker - Instructions & Setup Guide

Welcome to VisualDocker! This guide provides step-by-step instructions to set up, run, and maintain both the FastAPI backend engine and the React Flow frontend canvas application.

---

## 🛠️ Prerequisites

Before getting started, make sure you have the following installed on your machine:
- **Node.js**: v18.0.0 or higher ([Download](https://nodejs.org/))
- **Python**: v3.10, v3.11, or v3.13 ([Download](https://www.python.org/))
- **Docker Desktop**: Running with Docker Compose support ([Download](https://www.docker.com/products/docker-desktop/))

> **Note on Docker Engine Setup**:
> - Make sure Docker Desktop is open and active before clicking **DEPLOY STACK**.
> - **Windows Users**: If the backend fails to connect to the Docker socket, open Docker Desktop Settings $\rightarrow$ General and enable **"Expose daemon on tcp://localhost:2375 without TLS"**.
> - **Linux Users**: Add your user to the `docker` group (`sudo usermod -aG docker $USER`).

---

## 🚀 Quick Start Guide

### Step 1: Set Up Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   * **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\activate
     ```
   * **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   * The backend API will be available at `http://localhost:8000`.
   * Interactive API docs (Swagger UI) can be accessed at `http://localhost:8000/docs`.

---

### Step 2: Set Up Frontend

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

---

## 🎨 Key Features & Usage

### 1. Canvas & Handle Rules
- **Strict Directional Flow**: 
  - **Left Handle (Target)**: Accepts inputs, configuration, environment variables, ports, or incoming container links.
  - **Right Handle (Source)**: Emits outputs, network connections, volume mounts, or outbound dependencies.

### 2. Node Types
- **Container Node**: Represents a Docker container (e.g. `fastapi-service`, `postgres`, `redis`, `nginx`). Supports image tags, command overrides, port mappings, and volume bindings.
- **Network Node**: Custom Docker bridge network (e.g. `frontend-net`, `backend-net`).
- **Volume Node**: Named persistent volume mount (e.g. `db_data`, `redis_data`).
- **Port Node**: Host-to-Container port binding (e.g. `80:8000`).
- **Environment Node**: Custom environment variable bindings (e.g. `POSTGRES_PASSWORD=secret`).

### 3. Container Command Overrides
- When using base runtime images (such as `python:3.11-slim` or `node:18-alpine`) without pre-built application binaries or entrypoint scripts, set the container command override to:
  ```bash
  tail -f /dev/null
  ```
- This keeps the container alive in a daemonized state so you can connect via interactive CLI terminal.

### 4. Automatic Host Port Collision Shift
- If a host port (e.g. port `80` or `5432`) is already in use by another local process, the engine automatically auto-shifts the host port (e.g. `80` $\rightarrow$ `8080`, `5432` $\rightarrow$ `5433`) without crashing deployment.

---

## 🔍 Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `Internal Server Error 500` on deployment | Docker Desktop is not running | Start Docker Desktop application on your host machine. |
| `exec: "uvicorn": executable file not found in $PATH` | Base Python image missing `uvicorn` | In Node Settings, set Command Override to `tail -f /dev/null`. |
| `Port 80 is already allocated` | Another process is using port 80 | The auto-shift engine will auto-increment to `8080`. Alternatively, edit the Port Node on canvas. |
