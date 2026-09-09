import React, { useRef, useCallback, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import { Play, Square, RefreshCw, Trash2, X, Sparkles, FileText } from 'lucide-react';
import { ContainerNode, NetworkNode, VolumeNode, PortNode, EnvNode } from '../nodes/CustomNodes';
import { LeftSidebar } from '../components/LeftSidebar';
import { Header } from '../components/Header';
import { ConsoleViewer } from '../components/ConsoleViewer';
import { NodeSettingsModal } from '../components/NodeSettingsModal';
import { GeneratedFilesModal } from '../components/GeneratedFilesModal';
import { useAppStore } from '../store/useAppStore';
import axios from 'axios';

const nodeTypes = {
  containerNode: ContainerNode,
  networkNode: NetworkNode,
  volumeNode: VolumeNode,
  portNode: PortNode,
  envNode: EnvNode,
};

const CanvasContent: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setSelectedNode,
    setIsSettingsModalOpen,
    isAiModalOpen,
    setIsAiModalOpen,
    generatedYaml,
    isYamlOpen,
    setIsYamlOpen,
    addConsoleLog,
    loadPreset,
    activeTab
  } = useAppStore();

  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: {
          label: type === 'containerNode' ? 'NEW-SERVICE' : type.replace('Node', '').toUpperCase(),
          image: type === 'containerNode' ? 'python:3.11-slim' : undefined,
          command: type === 'containerNode' ? 'tail -f /dev/null' : undefined,
          host_port: type === 'portNode' ? '8080' : undefined,
          container_port: type === 'portNode' ? '80' : undefined,
          key: type === 'envNode' ? 'ENV_VAR' : undefined,
          value: type === 'envNode' ? 'value' : undefined,
        },
      };

      addNode(newNode);
      addConsoleLog(`[CANVAS] Added new ${type} to architecture layout.`);
    },
    [screenToFlowPosition, addNode, addConsoleLog]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: any) => {
      setSelectedNode(node);
      setIsSettingsModalOpen(true);
    },
    [setSelectedNode, setIsSettingsModalOpen]
  );

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    addConsoleLog(`[AI ENGINE] Processing prompt: "${aiPrompt}"...`);

    try {
      const res = await axios.post('/api/ai/suggest', { prompt: aiPrompt });
      if (res.data && res.data.nodes) {
        loadPreset(res.data.nodes, res.data.edges || []);
        addConsoleLog(`[AI ENGINE] Generated graph layout for prompt successfully!`);
        setIsAiModalOpen(false);
        setAiPrompt('');
      }
    } catch (err: any) {
      addConsoleLog(`[ERROR] AI Architecture Generation failed: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#120f0e]">
      {/* Top Header */}
      <Header />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Drag & Drop Palette */}
        <LeftSidebar />

        {/* Dynamic View Tab Rendering */}
        {activeTab === 'canvas' && (
          <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#3a312c" />
              <Controls />
            </ReactFlow>

            {/* AI Stack Architect Floating Action Button (Bottom Right) */}
            <div className="absolute bottom-4 right-4 z-20">
              <button
                onClick={() => setIsAiModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#241e1b] hover:bg-[#322a26] border-2 border-[#ff7b00]/40 text-[#ff7b00] rounded-xl font-mono text-[12px] font-bold uppercase tracking-wider shadow-2xl transition-all duration-200 hover:scale-105 hover:border-[#ff7b00]"
              >
                <Sparkles className="w-4 h-4 text-[#ff7b00]" />
                # AI STACK ARCHITECT
              </button>
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="flex-1 w-full h-full overflow-hidden p-4">
            <GeneratedFilesModal inline={true} />
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="flex-1 w-full h-full overflow-hidden p-4">
            <ConsoleViewer inline={true} />
          </div>
        )}
      </div>

      {/* Node Settings Modal */}
      <NodeSettingsModal />

      {/* Generated Files Explorer Modal */}
      {isYamlOpen && (
        <GeneratedFilesModal />
      )}

      {/* AI Suggest Popup (Bottom Right Corner without Backdrop Blur) */}
      {isAiModalOpen && (
        <div className="absolute bottom-4 right-4 z-40 w-full max-w-md bg-[#1a1614] border-2 border-[#ff7b00]/60 rounded-2xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.8)] space-y-4">
          <div className="flex items-center justify-between border-b border-[#3a312c] pb-3">
            <h3 className="font-extrabold text-[15px] text-[#ff7b00] uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#ff7b00]" />
              AI ARCHITECTURE BUILDER
            </h3>
            <button onClick={() => setIsAiModalOpen(false)} className="text-[#a3958c] hover:text-[#f0e8e2] transition">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[12px] text-[#a3958c] font-mono">
            Describe your target system (e.g. "FastAPI backend with Postgres database and redis cache").
          </p>
          <textarea
            rows={4}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. FastAPI app connected to PostgreSQL database and Redis network..."
            className="w-full bg-[#241e1b] border border-[#3a312c] rounded-xl p-3 text-[13px] text-[#f0e8e2] font-mono focus:border-[#ff7b00] focus:outline-none"
          />
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsAiModalOpen(false)}
              className="px-4 py-2 bg-[#241e1b] hover:bg-[#322a26] text-[#a3958c] hover:text-[#f0e8e2] rounded-lg text-[12px] uppercase font-bold transition"
            >
              CANCEL
            </button>
            <button
              onClick={handleAiGenerate}
              disabled={isAiLoading}
              className="px-5 py-2 bg-[#ff7b00] hover:bg-[#e06c00] text-black font-extrabold rounded-lg text-[12px] uppercase tracking-wider shadow-[0_0_15px_rgba(255,123,0,0.4)] disabled:opacity-50 transition"
            >
              {isAiLoading ? 'GENERATING...' : 'GENERATE GRAPH'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const Canvas: React.FC = () => (
  <ReactFlowProvider>
    <CanvasContent />
  </ReactFlowProvider>
);
