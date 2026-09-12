import React, { useState } from 'react';
import { Play, Square, Code, Sparkles, Server, Layout, Activity } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import axios from 'axios';

export const Header: React.FC = () => {
  const {
    nodes,
    edges,
    isDeploying,
    deploymentStatus,
    setIsDeploying,
    setDeploymentStatus,
    addConsoleLog,
    setGeneratedYaml,
    setGeneratedFiles,
    isYamlOpen,
    setIsYamlOpen,
    setIsAiModalOpen,
    activeTab,
    setActiveTab
  } = useAppStore();

  const handleStopStack = async () => {
    try {
      addConsoleLog('[DEPLOYMENT] Stopping running stack containers...');
      const res = await axios.post('/api/deployments/down');
      setDeploymentStatus('OFFLINE');
      addConsoleLog(`[DEPLOYMENT] ${res.data?.message || 'Stack stopped successfully.'}`);
    } catch (err: any) {
      setDeploymentStatus('OFFLINE');
      addConsoleLog(`[DEPLOYMENT] Stack status reset (${err.message}).`);
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeploymentStatus('DEPLOYING');
    addConsoleLog('[DEPLOYMENT] Stopping previous running stack containers...');

    try {
      await axios.post('/api/deployments/down');
    } catch (e) {
      // ignore non-critical stop errors before up
    }

    addConsoleLog('[DEPLOYMENT] Initiating stack deployment pipeline...');

    try {
      const payload = {
        graph: {
          nodes,
          edges
        }
      };

      const res = await axios.post('/api/deployments/up', payload);
      if (res.data && res.data.success) {
        setDeploymentStatus('RUNNING');
        addConsoleLog(`[SUCCESS] Stack deployed successfully! (${res.data.message})`);
      } else {
        setDeploymentStatus('ERROR');
        addConsoleLog(`[ERROR] Deployment failed: ${res.data.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      setDeploymentStatus('ERROR');
      const errDetail = err.response?.data?.detail || err.message;
      addConsoleLog(`[ERROR] ${typeof errDetail === 'object' ? JSON.stringify(errDetail) : errDetail}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleGenerateYaml = async () => {
    try {
      const res = await axios.post('/api/generate', { nodes, edges });
      setGeneratedYaml(res.data.compose_yaml);
      if (res.data.files) {
        setGeneratedFiles(res.data.files);
      }
      addConsoleLog('[ENGINE] Generated files preview updated.');
    } catch (err: any) {
      addConsoleLog(`[ERROR] File generation failed: ${err.message}`);
    }
  };

  return (
    <header className="h-16 bg-[#1a1614] border-b border-[#3a312c] px-6 flex items-center justify-between select-none">
      {/* Title & Brand */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#ff7b00] text-black rounded-lg shadow-[0_0_15px_rgba(255,123,0,0.5)]">
          <Server className="w-5 h-5 font-extrabold" />
        </div>
        <div>
          <h1 className="font-extrabold text-[15px] tracking-wider uppercase text-[#f0e8e2] flex items-center gap-2">
            VISUALDOCKER
            <span className="text-[10px] font-mono font-bold bg-[#ff7b00]/10 text-[#ff7b00] border border-[#ff7b00]/30 px-2 py-0.5 rounded-md">
              ENGINE v2.4
            </span>
          </h1>
          <p className="text-[11px] text-[#a3958c] font-mono">STRICT DIRECTIONAL FLOW • PORT AUTO-SHIFT ENABLED</p>
        </div>
      </div>

      {/* Right Navigation & Control Toolbar */}
      <div className="flex items-center gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center bg-[#241e1b] border border-[#3a312c] rounded-lg p-1 text-[12px] font-bold">
          <button
            onClick={() => setActiveTab('canvas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
              activeTab === 'canvas' ? 'bg-[#3a312c] text-[#ff7b00] shadow' : 'text-[#a3958c] hover:text-[#f0e8e2]'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            CANVAS
          </button>
          <button
            onClick={() => {
              handleGenerateYaml();
              setActiveTab('files');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
              activeTab === 'files' ? 'bg-[#3a312c] text-[#ff7b00] shadow' : 'text-[#a3958c] hover:text-[#f0e8e2]'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            FILES
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
              activeTab === 'logs' ? 'bg-[#3a312c] text-[#ff7b00] shadow' : 'text-[#a3958c] hover:text-[#f0e8e2]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            CONSOLE & STATUS
          </button>
        </div>

        {/* Deploy & Stop Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleStopStack}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-lg text-[12px] font-extrabold uppercase tracking-wider transition shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer"
            title="Stop all running Docker stack containers"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            STOP STACK
          </button>

          <button
            onClick={handleDeploy}
            disabled={isDeploying}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#ff7b00] hover:bg-[#e06c00] text-black font-extrabold rounded-lg text-[12px] tracking-wider uppercase transition shadow-[0_0_20px_rgba(255,123,0,0.4)] disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isDeploying ? 'DEPLOYING...' : 'DEPLOY STACK'}
          </button>
        </div>
      </div>
    </header>
  );
};
