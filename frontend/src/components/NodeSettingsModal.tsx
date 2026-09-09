import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Zap } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { CustomNodeData } from '../nodes/CustomNodes';

export const NodeSettingsModal: React.FC = () => {
  const { selectedNode, isSettingsModalOpen, setIsSettingsModalOpen, updateNodeData, removeNode, setSelectedNode } = useAppStore();

  const [label, setLabel] = useState('');
  const [image, setImage] = useState('');
  const [command, setCommand] = useState('');
  const [hostPort, setHostPort] = useState('');
  const [containerPort, setContainerPort] = useState('');
  const [containerPath, setContainerPath] = useState('');
  const [envKey, setEnvKey] = useState('');
  const [envVal, setEnvVal] = useState('');

  useEffect(() => {
    if (selectedNode && selectedNode.data) {
      const data = selectedNode.data as CustomNodeData;
      setLabel(data.label || '');
      setImage(data.image || '');
      setCommand(data.command || '');
      setHostPort(data.host_port || '');
      setContainerPort(data.container_port || '');
      setContainerPath(data.container_path || '');
      setEnvKey(data.key || '');
      setEnvVal(data.value || '');
    }
  }, [selectedNode]);

  if (!isSettingsModalOpen || !selectedNode) return null;

  const nodeType = selectedNode.type || 'containerNode';

  const handleSave = () => {
    const updatedData: any = { ...selectedNode.data, label };
    if (nodeType === 'containerNode') {
      updatedData.image = image;
      updatedData.command = command || undefined;
    } else if (nodeType === 'portNode') {
      updatedData.host_port = hostPort;
      updatedData.container_port = containerPort;
    } else if (nodeType === 'volumeNode') {
      updatedData.container_path = containerPath;
    } else if (nodeType === 'envNode') {
      updatedData.key = envKey;
      updatedData.value = envVal;
    }

    updateNodeData(selectedNode.id, updatedData);
    setIsSettingsModalOpen(false);
    setSelectedNode(null);
  };

  const handleDelete = () => {
    removeNode(selectedNode.id);
    setIsSettingsModalOpen(false);
    setSelectedNode(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#1a1614] border-2 border-[#3a312c] rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3a312c] pb-3">
          <h3 className="font-extrabold text-[16px] text-[#f0e8e2] uppercase tracking-wider flex items-center gap-2">
            CONFIGURE NODE ({nodeType.replace('Node', '').toUpperCase()})
          </h3>
          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="p-1 text-[#a3958c] hover:text-[#f0e8e2] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4 text-[13px] font-mono">
          <div>
            <label className="block text-[#a3958c] text-[11px] font-bold uppercase mb-1">
              NODE LABEL / SERVICE NAME
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-[#241e1b] border border-[#3a312c] rounded-lg px-3 py-2 text-[#f0e8e2] focus:border-[#ff7b00] focus:outline-none"
            />
          </div>

          {nodeType === 'containerNode' && (
            <>
              <div>
                <label className="block text-[#a3958c] text-[11px] font-bold uppercase mb-1">
                  DOCKER IMAGE TAG
                </label>
                <input
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="e.g. python:3.11-slim"
                  className="w-full bg-[#241e1b] border border-[#3a312c] rounded-lg px-3 py-2 text-[#f0e8e2] focus:border-[#ff7b00] focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[#a3958c] text-[11px] font-bold uppercase">
                    COMMAND OVERRIDE
                  </label>
                  <button
                    type="button"
                    onClick={() => setCommand('tail -f /dev/null')}
                    className="flex items-center gap-1 text-[11px] text-[#ff7b00] hover:underline font-bold"
                  >
                    <Zap className="w-3 h-3" />
                    [ ⚡ tail -f /dev/null ]
                  </button>
                </div>
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="e.g. tail -f /dev/null"
                  className="w-full bg-[#241e1b] border border-[#3a312c] rounded-lg px-3 py-2 text-[#f0e8e2] focus:border-[#ff7b00] focus:outline-none"
                />
              </div>
            </>
          )}

          {nodeType === 'portNode' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#a3958c] text-[11px] font-bold uppercase mb-1">HOST PORT</label>
                <input
                  type="text"
                  value={hostPort}
                  onChange={(e) => setHostPort(e.target.value)}
                  className="w-full bg-[#241e1b] border border-[#3a312c] rounded-lg px-3 py-2 text-[#f0e8e2] focus:border-[#ff7b00] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#a3958c] text-[11px] font-bold uppercase mb-1">CONTAINER PORT</label>
                <input
                  type="text"
                  value={containerPort}
                  onChange={(e) => setContainerPort(e.target.value)}
                  className="w-full bg-[#241e1b] border border-[#3a312c] rounded-lg px-3 py-2 text-[#f0e8e2] focus:border-[#ff7b00] focus:outline-none"
                />
              </div>
            </div>
          )}

          {nodeType === 'volumeNode' && (
            <div>
              <label className="block text-[#a3958c] text-[11px] font-bold uppercase mb-1">CONTAINER MOUNT PATH</label>
              <input
                type="text"
                value={containerPath}
                onChange={(e) => setContainerPath(e.target.value)}
                placeholder="/var/lib/data"
                className="w-full bg-[#241e1b] border border-[#3a312c] rounded-lg px-3 py-2 text-[#f0e8e2] focus:border-[#ff7b00] focus:outline-none"
              />
            </div>
          )}

          {nodeType === 'envNode' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#a3958c] text-[11px] font-bold uppercase mb-1">KEY</label>
                <input
                  type="text"
                  value={envKey}
                  onChange={(e) => setEnvKey(e.target.value)}
                  className="w-full bg-[#241e1b] border border-[#3a312c] rounded-lg px-3 py-2 text-[#f0e8e2] focus:border-[#ff7b00] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#a3958c] text-[11px] font-bold uppercase mb-1">VALUE</label>
                <input
                  type="text"
                  value={envVal}
                  onChange={(e) => setEnvVal(e.target.value)}
                  className="w-full bg-[#241e1b] border border-[#3a312c] rounded-lg px-3 py-2 text-[#f0e8e2] focus:border-[#ff7b00] focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[#3a312c] pt-4">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-bold text-[12px] uppercase transition"
          >
            <Trash2 className="w-4 h-4" />
            DELETE NODE
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 bg-[#ff7b00] hover:bg-[#e06c00] text-black font-extrabold rounded-lg text-[12px] uppercase tracking-wider transition shadow-[0_0_15px_rgba(255,123,0,0.4)]"
          >
            <Save className="w-4 h-4" />
            SAVE CHANGES
          </button>
        </div>
      </div>
    </div>
  );
};
