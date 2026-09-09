import { create } from 'zustand';
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from '@xyflow/react';

export interface AppState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  isSettingsModalOpen: boolean;
  isAiModalOpen: boolean;
  isDeploying: boolean;
  deploymentStatus: 'OFFLINE' | 'DEPLOYING' | 'RUNNING' | 'ERROR';
  consoleLogs: string[];
  generatedYaml: string | null;
  generatedFiles: Array<{ filename: string; language: string; content: string }>;
  isYamlOpen: boolean;
  
  activeTab: 'canvas' | 'files' | 'logs';
  
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: Node) => void;
  updateNodeData: (nodeId: string, data: any) => void;
  removeNode: (nodeId: string) => void;
  setSelectedNode: (node: Node | null) => void;
  setIsSettingsModalOpen: (open: boolean) => void;
  setIsAiModalOpen: (open: boolean) => void;
  setIsDeploying: (deploying: boolean) => void;
  setDeploymentStatus: (status: 'OFFLINE' | 'DEPLOYING' | 'RUNNING' | 'ERROR') => void;
  addConsoleLog: (log: string) => void;
  setGeneratedYaml: (yaml: string | null) => void;
  setGeneratedFiles: (files: Array<{ filename: string; language: string; content: string }>) => void;
  setIsYamlOpen: (open: boolean) => void;
  setActiveTab: (tab: 'canvas' | 'files' | 'logs') => void;
  loadPreset: (presetNodes: Node[], presetEdges: Edge[]) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  nodes: [
    {
      id: 'c1',
      type: 'containerNode',
      position: { x: 300, y: 150 },
      data: {
        label: 'FASTAPI-SERVICE',
        image: 'python:3.11-slim',
        command: 'tail -f /dev/null',
        ports: ['8000:8000']
      }
    },
    {
      id: 'c2',
      type: 'containerNode',
      position: { x: 680, y: 150 },
      data: {
        label: 'POSTGRES-DB',
        image: 'postgres:15-alpine',
        environment: { POSTGRES_PASSWORD: 'secretpassword' }
      }
    },
    {
      id: 'p1',
      type: 'portNode',
      position: { x: 60, y: 150 },
      data: { host_port: '8000', container_port: '8000' }
    },
    {
      id: 'n1',
      type: 'networkNode',
      position: { x: 490, y: 380 },
      data: { label: 'BACKEND-NET', driver: 'bridge' }
    }
  ],
  edges: [
    { id: 'e1', source: 'p1', target: 'c1', type: 'smoothstep', animated: true },
    { id: 'e2', source: 'c2', target: 'c1', type: 'smoothstep', animated: true },
    { id: 'e3', source: 'c1', target: 'n1', type: 'smoothstep' },
    { id: 'e4', source: 'c2', target: 'n1', type: 'smoothstep' }
  ],
  selectedNode: null,
  isSettingsModalOpen: false,
  isAiModalOpen: false,
  isDeploying: false,
  deploymentStatus: 'OFFLINE',
  consoleLogs: [
    '[ENGINE] Canvas initialization complete.',
    '[ENGINE] Workspace state connected to local Docker daemon.',
    '[SYSTEM] Ready to deploy stack.'
  ],
  generatedYaml: null,
  generatedFiles: [],
  isYamlOpen: false,
  activeTab: 'canvas',

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    const updatedEdges = addEdge({ ...connection, type: 'smoothstep', animated: true }, get().edges);
    set({ edges: updatedEdges });
  },

  addNode: (node) => {
    set({ nodes: [...get().nodes, node] });
  },

  updateNodeData: (nodeId, newData) => {
    set({
      nodes: get().nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n))
    });
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId)
    });
  },

  setSelectedNode: (node) => set({ selectedNode: node }),
  setIsSettingsModalOpen: (open) => set({ isSettingsModalOpen: open }),
  setIsAiModalOpen: (open) => set({ isAiModalOpen: open }),
  setIsDeploying: (deploying) => set({ isDeploying: deploying }),
  setDeploymentStatus: (status) => set({ deploymentStatus: status }),
  addConsoleLog: (log) => set({ consoleLogs: [...get().consoleLogs, log] }),
  setGeneratedYaml: (yaml) => set({ generatedYaml: yaml }),
  setGeneratedFiles: (files) => set({ generatedFiles: files }),
  setIsYamlOpen: (open) => set({ isYamlOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  loadPreset: (presetNodes, presetEdges) => {
    const sanitizedNodes = (presetNodes || []).map((node, idx) => ({
      ...node,
      position: node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number'
        ? node.position
        : { x: 200 + (idx % 3) * 280, y: 150 + Math.floor(idx / 3) * 200 }
    }));
    set({ nodes: sanitizedNodes, edges: presetEdges || [] });
  }
}));
