import React from 'react';
import { ContainerIcon, NetworkIcon, VolumeIcon, PortIcon, EnvIcon } from './TechIcons';
import { useAppStore } from '../store/useAppStore';

export const LeftSidebar: React.FC = () => {
  const { addNode, addConsoleLog, nodes, setActiveTab } = useAppStore();

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleAddNode = (type: string) => {
    setActiveTab('canvas');
    const existingCount = nodes.length;
    const position = {
      x: 250 + (existingCount % 4) * 260,
      y: 120 + Math.floor(existingCount / 4) * 180
    };

    let label = 'SERVICE';
    if (type === 'containerNode') label = `SERVICE_${existingCount + 1}`;
    if (type === 'networkNode') label = `NET_${existingCount + 1}`;
    if (type === 'volumeNode') label = `VOL_${existingCount + 1}`;
    if (type === 'portNode') label = `PORT_${existingCount + 1}`;
    if (type === 'envNode') label = `ENV_${existingCount + 1}`;

    const newNode = {
      id: `${type}_${Date.now()}`,
      type,
      position,
      data: {
        label,
        image: type === 'containerNode' ? 'python:3.11-slim' : undefined,
        command: type === 'containerNode' ? 'tail -f /dev/null' : undefined,
        host_port: type === 'portNode' ? '8080' : undefined,
        container_port: type === 'portNode' ? '80' : undefined,
        key: type === 'envNode' ? 'KEY' : undefined,
        value: type === 'envNode' ? 'VALUE' : undefined,
      },
    };

    addNode(newNode);
    addConsoleLog(`[CANVAS] Added new ${type} (${label}) to canvas.`);
  };

  return (
    <aside className="w-64 bg-[#1a1614] border-r border-[#3a312c] p-4 flex flex-col gap-6 select-none overflow-y-auto">
      <div>
        <h2 className="text-[11px] font-mono font-bold text-[#ff7b00] tracking-widest uppercase mb-3">
          1. CONTAINERS & SERVICES
        </h2>
        <div
          onClick={() => handleAddNode('containerNode')}
          onDragStart={(e) => onDragStart(e, 'containerNode')}
          draggable
          className="flex items-center gap-3 p-3 bg-[#241e1b] hover:bg-[#322a26] border border-[#3a312c] hover:border-[#ff7b00] rounded-xl cursor-pointer active:cursor-grabbing transition group shadow-md"
          title="Click or Drag to add Container"
        >
          <div className="p-2 bg-[#ff7b00]/10 text-[#ff7b00] rounded-lg group-hover:scale-110 transition">
            <ContainerIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-[13px] text-[#f0e8e2]">CONTAINER</div>
            <div className="text-[11px] font-mono text-[#a3958c]">Docker Service</div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-[11px] font-mono font-bold text-[#ff7b00] tracking-widest uppercase mb-3">
          2. NETWORKS & VOLUMES
        </h2>
        <div className="space-y-2.5">
          <div
            onClick={() => handleAddNode('networkNode')}
            onDragStart={(e) => onDragStart(e, 'networkNode')}
            draggable
            className="flex items-center gap-3 p-3 bg-[#161d19] hover:bg-[#1f2924] border border-emerald-900/60 hover:border-emerald-500 rounded-xl cursor-pointer active:cursor-grabbing transition group shadow-md"
            title="Click or Drag to add Network"
          >
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:scale-110 transition">
              <NetworkIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-[13px] text-emerald-400">NETWORK</div>
              <div className="text-[11px] font-mono text-emerald-300/70">Bridge / Overlay</div>
            </div>
          </div>

          <div
            onClick={() => handleAddNode('volumeNode')}
            onDragStart={(e) => onDragStart(e, 'volumeNode')}
            draggable
            className="flex items-center gap-3 p-3 bg-[#1a1724] hover:bg-[#241f33] border border-purple-900/60 hover:border-purple-500 rounded-xl cursor-pointer active:cursor-grabbing transition group shadow-md"
            title="Click or Drag to add Volume"
          >
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg group-hover:scale-110 transition">
              <VolumeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-[13px] text-purple-400">VOLUME</div>
              <div className="text-[11px] font-mono text-purple-300/70">Persistent Mount</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-[11px] font-mono font-bold text-[#ff7b00] tracking-widest uppercase mb-3">
          3. PORTS & ENVIRONMENT
        </h2>
        <div className="space-y-2.5">
          <div
            onClick={() => handleAddNode('portNode')}
            onDragStart={(e) => onDragStart(e, 'portNode')}
            draggable
            className="flex items-center gap-3 p-3 bg-[#241c14] hover:bg-[#33271c] border border-amber-900/60 hover:border-amber-500 rounded-xl cursor-pointer active:cursor-grabbing transition group shadow-md"
            title="Click or Drag to add Port Bind"
          >
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg group-hover:scale-110 transition">
              <PortIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-[13px] text-amber-400">PORT BIND</div>
              <div className="text-[11px] font-mono text-amber-300/70">Host : Container</div>
            </div>
          </div>

          <div
            onClick={() => handleAddNode('envNode')}
            onDragStart={(e) => onDragStart(e, 'envNode')}
            draggable
            className="flex items-center gap-3 p-3 bg-[#182024] hover:bg-[#202c33] border border-cyan-900/60 hover:border-cyan-500 rounded-xl cursor-pointer active:cursor-grabbing transition group shadow-md"
            title="Click or Drag to add Env Var"
          >
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg group-hover:scale-110 transition">
              <EnvIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-[13px] text-cyan-400">ENV VAR</div>
              <div className="text-[11px] font-mono text-cyan-300/70">KEY = VALUE</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto p-3 bg-[#241e1b]/50 border border-[#3a312c] rounded-xl text-[11px] font-mono text-[#a3958c]">
        <div className="text-[#ff7b00] font-bold mb-1">💡 QUICK CONTROLS:</div>
        <div>• Click or Drag item to add to canvas</div>
        <div>• Left Handle = Input (Target)</div>
        <div>• Right Handle = Output (Source)</div>
      </div>
    </aside>
  );
};
