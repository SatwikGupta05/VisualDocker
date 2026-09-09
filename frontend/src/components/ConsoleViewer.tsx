import React, { useState, useEffect, useRef } from 'react';
import { TerminalIcon } from './TechIcons';
import { useAppStore } from '../store/useAppStore';

interface ConsoleViewerProps {
  inline?: boolean;
}

export const ConsoleViewer: React.FC<ConsoleViewerProps> = ({ inline = false }) => {
  const { consoleLogs, deploymentStatus } = useAppStore();
  const [cliInput, setCliInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    'Antigravity Interactive Docker CLI v2.4 initialized.',
    'Type `help` or `docker compose ps` to inspect running services.'
  ]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs, terminalHistory]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliInput.trim()) return;

    const cmd = cliInput.trim();
    const newHist = [...terminalHistory, `$ ${cmd}`];

    if (cmd.toLowerCase() === 'help') {
      newHist.push('Available CLI Commands:');
      newHist.push('  docker ps          - List running stack containers');
      newHist.push('  docker compose logs- Stream container output');
      newHist.push('  clear              - Clear terminal history');
    } else if (cmd.toLowerCase() === 'clear') {
      setTerminalHistory([]);
      setCliInput('');
      return;
    } else if (cmd.toLowerCase().includes('ps')) {
      newHist.push('CONTAINER ID   NAME               IMAGE               STATUS          PORTS');
      newHist.push('a1b2c3d4e5f6   fastapi-service    python:3.11-slim    Up 2 minutes    0.0.0.0:8000->8000/tcp');
      newHist.push('f6e5d4c3b2a1   postgres-db        postgres:15-alpine  Up 2 minutes    5432/tcp');
    } else {
      newHist.push(`Executing: ${cmd}... OK`);
    }

    setTerminalHistory(newHist);
    setCliInput('');
  };

  return (
    <div className={`w-full ${inline ? 'h-full flex-1' : 'h-72'} bg-[#161210] border-t border-[#3a312c] flex flex-col font-term text-[12px] select-none rounded-xl overflow-hidden`}>
      {/* Console Tab Header */}
      <div className="h-9 bg-[#1a1614] border-b border-[#3a312c] px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[#ff7b00] font-bold tracking-wider uppercase text-[11px]">
            <TerminalIcon className="w-4 h-4" />
            CONSOLE & TERMINAL METRICS
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
            deploymentStatus === 'RUNNING' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#241e1b] text-[#a3958c]'
          }`}>
            STATUS: {deploymentStatus}
          </span>
        </div>
      </div>

      {/* 3-Tier Console Layout */}
      <div className="flex-1 grid grid-rows-3 gap-1 p-3 overflow-hidden bg-[#120f0e]">
        {/* Tier 1: Local Engine Status Table */}
        <div className="bg-[#1a1614] border border-[#3a312c] rounded-lg p-2 overflow-x-auto">
          <div className="text-[10px] text-[#ff7b00] font-bold uppercase mb-1 flex items-center gap-2">
            <span>1. LOCAL ENGINE STATUS TABLE</span>
          </div>
          <table className="w-full text-left text-[11px] font-mono">
            <thead>
              <tr className="text-[#a3958c] border-b border-[#3a312c]">
                <th className="pb-1">CONTAINER</th>
                <th className="pb-1">IMAGE</th>
                <th className="pb-1">STATUS</th>
                <th className="pb-1">CPU %</th>
                <th className="pb-1">RAM</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-[#f0e8e2]">
                <td className="py-0.5 text-amber-400 font-bold">fastapi-service</td>
                <td className="py-0.5 text-[#a3958c]">python:3.11-slim</td>
                <td className="py-0.5 text-emerald-400">● RUNNING</td>
                <td className="py-0.5">0.4%</td>
                <td className="py-0.5">42.8 MB</td>
              </tr>
              <tr className="text-[#f0e8e2]">
                <td className="py-0.5 text-blue-400 font-bold">postgres-db</td>
                <td className="py-0.5 text-[#a3958c]">postgres:15-alpine</td>
                <td className="py-0.5 text-emerald-400">● RUNNING</td>
                <td className="py-0.5">0.1%</td>
                <td className="py-0.5">28.4 MB</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tier 2: Deployment Output Console */}
        <div className="bg-[#1a1614] border border-[#3a312c] rounded-lg p-2 overflow-y-auto space-y-1">
          <div className="text-[10px] text-amber-400 font-bold uppercase mb-1">
            2. DEPLOYMENT OUTPUT CONSOLE
          </div>
          {consoleLogs.map((log, idx) => (
            <div key={idx} className="text-[#f0e8e2] leading-tight">
              <span className="text-[#a3958c] mr-2">[{new Date().toLocaleTimeString()}]</span>
              {log}
            </div>
          ))}
        </div>

        {/* Tier 3: Interactive CLI Terminal */}
        <div className="bg-[#1a1614] border border-[#3a312c] rounded-lg p-2 flex flex-col justify-between overflow-hidden">
          <div className="overflow-y-auto space-y-0.5 flex-1 pr-1">
            {terminalHistory.map((line, idx) => (
              <div key={idx} className="text-emerald-400 leading-tight">
                {line}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
          <form onSubmit={handleCommandSubmit} className="flex items-center gap-2 pt-1 border-t border-[#3a312c]">
            <span className="text-[#ff7b00] font-bold">$</span>
            <input
              type="text"
              value={cliInput}
              onChange={(e) => setCliInput(e.target.value)}
              placeholder="Enter docker compose command..."
              className="flex-1 bg-transparent text-[#f0e8e2] focus:outline-none font-term text-[12px]"
            />
          </form>
        </div>
      </div>
    </div>
  );
};
