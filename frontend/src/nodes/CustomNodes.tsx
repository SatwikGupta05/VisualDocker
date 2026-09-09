import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ContainerIcon, NetworkIcon, VolumeIcon, PortIcon, EnvIcon } from '../components/TechIcons';
import { useAppStore } from '../store/useAppStore';

export interface CustomNodeData {
  label?: string;
  image?: string;
  command?: string;
  ports?: string[];
  driver?: string;
  container_path?: string;
  host_port?: string;
  container_port?: string;
  key?: string;
  value?: string;
}

export const ContainerNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as CustomNodeData;
  const deploymentStatus = useAppStore((s) => s.deploymentStatus);
  const isRunning = deploymentStatus === 'RUNNING';

  return (
    <div className={`relative min-w-[220px] bg-[#1a1614] border-2 rounded-xl p-4 shadow-2xl transition-all duration-200 ${
      selected ? 'border-[#ff7b00] shadow-[0_0_15px_rgba(255,123,0,0.4)]' : 'border-[#3a312c] hover:border-[#5a4c44]'
    }`}>
      {/* Strict Directional Handles */}
      <Handle type="target" position={Position.Left} id="target" className="!bg-[#120f0e] !border-2 !border-[#ff7b00]" />
      <Handle type="source" position={Position.Right} id="source" className="!bg-[#120f0e] !border-2 !border-[#ff7b00]" />

      <div className="flex items-center justify-between gap-3 mb-2 border-b border-[#3a312c] pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#ff7b00]/10 text-[#ff7b00] rounded-lg">
            <ContainerIcon className="w-5 h-5" />
          </div>
          <span className="font-bold text-[15px] tracking-wide uppercase text-[#f0e8e2]">
            {nodeData.label || 'CONTAINER'}
          </span>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
          isRunning ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
        }`}>
          {isRunning ? '● RUNNING' : 'OFFLINE'}
        </span>
      </div>

      <div className="space-y-1.5 font-mono text-[12px] text-[#a3958c]">
        <div className="flex items-center justify-between">
          <span>IMAGE:</span>
          <span className="text-[#f0e8e2] font-semibold">{nodeData.image || 'ubuntu:latest'}</span>
        </div>
        {nodeData.command && (
          <div className="flex items-center justify-between text-[11px] text-amber-400/90 truncate">
            <span>CMD:</span>
            <span className="truncate max-w-[130px] font-mono">{nodeData.command}</span>
          </div>
        )}
        {nodeData.ports && nodeData.ports.length > 0 && (
          <div className="flex items-center justify-between text-[#ff7b00]">
            <span>PORTS:</span>
            <span className="font-bold">{nodeData.ports.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const NetworkNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as CustomNodeData;

  return (
    <div className={`relative min-w-[180px] bg-[#161d19] border-2 rounded-xl p-3.5 shadow-xl transition-all ${
      selected ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-emerald-900/60 hover:border-emerald-700'
    }`}>
      <Handle type="target" position={Position.Left} id="target" className="!bg-[#120f0e] !border-2 !border-emerald-400" />
      <Handle type="source" position={Position.Right} id="source" className="!bg-[#120f0e] !border-2 !border-emerald-400" />

      <div className="flex items-center gap-2 text-emerald-400 font-bold text-[13px] uppercase tracking-wide">
        <NetworkIcon className="w-4 h-4" />
        <span>{nodeData.label || 'NETWORK'}</span>
      </div>
      <div className="text-[11px] font-mono text-emerald-300/70 mt-1">
        DRIVER: {nodeData.driver || 'bridge'}
      </div>
    </div>
  );
};

export const VolumeNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as CustomNodeData;

  return (
    <div className={`relative min-w-[180px] bg-[#1a1724] border-2 rounded-xl p-3.5 shadow-xl transition-all ${
      selected ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'border-purple-900/60 hover:border-purple-700'
    }`}>
      <Handle type="target" position={Position.Left} id="target" className="!bg-[#120f0e] !border-2 !border-purple-400" />
      <Handle type="source" position={Position.Right} id="source" className="!bg-[#120f0e] !border-2 !border-purple-400" />

      <div className="flex items-center gap-2 text-purple-400 font-bold text-[13px] uppercase tracking-wide">
        <VolumeIcon className="w-4 h-4" />
        <span>{nodeData.label || 'VOLUME'}</span>
      </div>
      <div className="text-[11px] font-mono text-purple-300/70 mt-1 truncate">
        PATH: {nodeData.container_path || '/var/data'}
      </div>
    </div>
  );
};

export const PortNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as CustomNodeData;

  return (
    <div className={`relative min-w-[150px] bg-[#241c14] border-2 rounded-xl p-3 shadow-xl transition-all ${
      selected ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'border-amber-900/60 hover:border-amber-700'
    }`}>
      <Handle type="target" position={Position.Left} id="target" className="!bg-[#120f0e] !border-2 !border-amber-400" />
      <Handle type="source" position={Position.Right} id="source" className="!bg-[#120f0e] !border-2 !border-amber-400" />

      <div className="flex items-center gap-2 text-amber-400 font-bold text-[13px] uppercase tracking-wide">
        <PortIcon className="w-4 h-4" />
        <span>PORT BIND</span>
      </div>
      <div className="text-[13px] font-mono font-bold text-amber-200 mt-1">
        {nodeData.host_port || '8000'} : {nodeData.container_port || '8000'}
      </div>
    </div>
  );
};

export const EnvNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as CustomNodeData;

  return (
    <div className={`relative min-w-[160px] bg-[#182024] border-2 rounded-xl p-3 shadow-xl transition-all ${
      selected ? 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-cyan-900/60 hover:border-cyan-700'
    }`}>
      <Handle type="target" position={Position.Left} id="target" className="!bg-[#120f0e] !border-2 !border-cyan-400" />
      <Handle type="source" position={Position.Right} id="source" className="!bg-[#120f0e] !border-2 !border-cyan-400" />

      <div className="flex items-center gap-2 text-cyan-400 font-bold text-[13px] uppercase tracking-wide">
        <EnvIcon className="w-4 h-4" />
        <span>ENV VAR</span>
      </div>
      <div className="text-[11px] font-mono text-cyan-200 mt-1 truncate">
        {nodeData.key || 'KEY'} = {nodeData.value || 'VALUE'}
      </div>
    </div>
  );
};
