import React from 'react';
import { ContainerIcon, NetworkIcon, VolumeIcon, PortIcon, EnvIcon } from './TechIcons';

export const LeftSidebar: React.FC = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 bg-[#1a1614] border-r border-[#3a312c] p-4 flex flex-col gap-6 select-none overflow-y-auto">
      <div>
        <h2 className="text-[11px] font-mono font-bold text-[#ff7b00] tracking-widest uppercase mb-3">
          1. CONTAINERS & SERVICES
        </h2>
        <div
          onDragStart={(e) => onDragStart(e, 'containerNode')}
          draggable
          className="flex items-center gap-3 p-3 bg-[#241e1b] hover:bg-[#322a26] border border-[#3a312c] hover:border-[#ff7b00] rounded-xl cursor-grab active:cursor-grabbing transition group shadow-md"
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
            onDragStart={(e) => onDragStart(e, 'networkNode')}
            draggable
            className="flex items-center gap-3 p-3 bg-[#161d19] hover:bg-[#1f2924] border border-emerald-900/60 hover:border-emerald-500 rounded-xl cursor-grab active:cursor-grabbing transition group shadow-md"
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
            onDragStart={(e) => onDragStart(e, 'volumeNode')}
            draggable
            className="flex items-center gap-3 p-3 bg-[#1a1724] hover:bg-[#241f33] border border-purple-900/60 hover:border-purple-500 rounded-xl cursor-grab active:cursor-grabbing transition group shadow-md"
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
            onDragStart={(e) => onDragStart(e, 'portNode')}
            draggable
            className="flex items-center gap-3 p-3 bg-[#241c14] hover:bg-[#33271c] border border-amber-900/60 hover:border-amber-500 rounded-xl cursor-grab active:cursor-grabbing transition group shadow-md"
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
            onDragStart={(e) => onDragStart(e, 'envNode')}
            draggable
            className="flex items-center gap-3 p-3 bg-[#182024] hover:bg-[#202c33] border border-cyan-900/60 hover:border-cyan-500 rounded-xl cursor-grab active:cursor-grabbing transition group shadow-md"
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
        <div className="text-[#ff7b00] font-bold mb-1">💡 HANDLE TIPS:</div>
        <div>Left Handle = Input (Target)</div>
        <div>Right Handle = Output (Source)</div>
      </div>
    </aside>
  );
};
