import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, RefreshCw, FileText, CheckCircle2, RotateCcw, Activity, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import axios from 'axios';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  nodesCount?: number;
  hasRevertOption?: boolean;
  recommendedCommand?: string;
  isSolutionExecuted?: boolean;
  suggestedGraph?: { nodes: any[]; edges: any[] };
  hasIssues?: boolean;
}

export const AiChatbotPopup: React.FC = () => {
  const { nodes, edges, isAiModalOpen, setIsAiModalOpen, loadPreset, addConsoleLog, consoleLogs } = useAppStore();
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExecutingFix, setIsExecutingFix] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [previousGraph, setPreviousGraph] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Hello! I am your AI Stack Architect. Describe your system requirements (e.g. "React frontend, Node.js backend, and PostgreSQL database on an app-network"), click "Inspect Canvas", or click "Analyse Logs" to diagnose stack errors.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isAiModalOpen) return null;

  const handleSendMessage = async (promptToSend?: string) => {
    const textPrompt = promptToSend || inputPrompt;
    if (!textPrompt.trim() || isLoading) return;

    // Backup current graph state before applying AI changes
    setPreviousGraph({ nodes: [...nodes], edges: [...edges] });

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!promptToSend) setInputPrompt('');
    setIsLoading(true);
    addConsoleLog(`[AI CHATBOT] Processing user prompt: "${textPrompt}"...`);

    try {
      const isInspectOrModify = textPrompt.toLowerCase().includes('inspect') || textPrompt.toLowerCase().includes('current') || textPrompt.toLowerCase().includes('add');
      const currentCanvasContext = (isInspectOrModify && nodes.length > 0)
        ? `Current canvas graph has ${nodes.length} nodes: [${nodes.map(n => n.data?.label || n.id).join(', ')}]. `
        : '';
      const fullPrompt = `${currentCanvasContext}${textPrompt}`;
      const res = await axios.post('/api/ai/suggest', { prompt: fullPrompt });
      if (res.data && res.data.nodes) {
        const generatedNodes = res.data.nodes;
        const generatedEdges = res.data.edges || [];

        // Apply generated topology to canvas
        loadPreset(generatedNodes, generatedEdges);

        const botReply: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `I have updated your canvas graph with ${generatedNodes.length} nodes and ${generatedEdges.length} connections.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          nodesCount: generatedNodes.length,
          hasRevertOption: true
        };
        setMessages((prev) => [...prev, botReply]);
        addConsoleLog(`[AI CHATBOT] Applied ${generatedNodes.length} nodes and ${generatedEdges.length} edges to canvas.`);
      } else {
        throw new Error('Invalid graph structure returned');
      }
    } catch (err: any) {
      const errorReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `Error generating architecture layout: ${err.message || 'Failed to communicate with AI engine'}. Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorReply]);
      addConsoleLog(`[ERROR] AI Chatbot generation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevertGraph = () => {
    if (!previousGraph) return;
    loadPreset(previousGraph.nodes, previousGraph.edges);
    addConsoleLog(`[AI CHATBOT] Reverted canvas graph to previous state (${previousGraph.nodes.length} nodes).`);

    const revertReply: Message = {
      id: Date.now().toString(),
      sender: 'assistant',
      text: `🔄 Successfully reverted the canvas back to your previous layout (${previousGraph.nodes.length} nodes).`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, revertReply]);
    setPreviousGraph(null);
  };

  const handleInspectGraph = async () => {
    if (nodes.length === 0) {
      const emptyMsg: Message = {
        id: Date.now().toString(),
        sender: 'assistant',
        text: '⚠️ Canvas is empty. Drag services onto the grid or describe an architecture to generate!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, emptyMsg]);
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: `🔍 Inspect & Audit Canvas Architecture (${nodes.length} nodes, ${edges.length} connections)...`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    addConsoleLog('[AI CHATBOT] Running AI DevOps architecture audit on current canvas...');

    try {
      const res = await axios.post('/api/ai/inspect', {
        graph: { nodes, edges }
      });

      if (res.data && res.data.review) {
        const botReply: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: res.data.review,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedGraph: res.data.suggested_graph,
          hasIssues: res.data.has_issues
        };
        setMessages((prev) => [...prev, botReply]);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `Error auditing canvas graph: ${err.message || 'Failed to communicate with AI engine'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeLogs = async () => {
    if (!consoleLogs || consoleLogs.length === 0) {
      const emptyMsg: Message = {
        id: Date.now().toString(),
        sender: 'assistant',
        text: '⚠️ No deployment or system logs found to analyze yet. Run or deploy a stack first!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, emptyMsg]);
      return;
    }

    // Isolate logs from the LATEST stack deployment attempt
    let lastDeployIndex = -1;
    for (let i = consoleLogs.length - 1; i >= 0; i--) {
      if (consoleLogs[i].includes('[DEPLOYMENT] Initiating') || consoleLogs[i].includes('[DEPLOYMENT] Stopping previous')) {
        lastDeployIndex = i;
        break;
      }
    }

    const targetLogs = lastDeployIndex !== -1 ? consoleLogs.slice(lastDeployIndex) : consoleLogs;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: `🔍 Analyse latest stack deployment logs (${targetLogs.length} entries)...`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    addConsoleLog('[AI CHATBOT] Analyzing latest stack deployment logs...');

    try {
      const logsCombined = targetLogs.join('\n');
      const res = await axios.post('/api/ai/analyze-logs', { logs: logsCombined });
      if (res.data && res.data.analysis) {
        const botReply: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: res.data.analysis,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          recommendedCommand: res.data.recommended_command
        };
        setMessages((prev) => [...prev, botReply]);
      }
    } catch (err: any) {
      const errorReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `Error analyzing logs: ${err.message || 'Failed to communicate with log analyzer'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorReply]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteSolution = async (msg: Message) => {
    if (!msg.recommendedCommand) return;
    setIsExecutingFix(true);
    addConsoleLog(`[AI CHATBOT] Executing solution fix: "${msg.recommendedCommand}"...`);

    try {
      const res = await axios.post('/api/ai/execute-fix', { command: msg.recommendedCommand });
      
      // Mark solution executed
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isSolutionExecuted: true } : m));

      const botConfirmMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `⚡ **Solution Executed Successfully!**\n\nCommand Executed:\n\`${msg.recommendedCommand}\`\n\nResult Output:\n\`\`\`text\n${res.data.output || 'Done.'}\n\`\`\`\n\n👉 Click **RE-DEPLOY STACK** in the top navigation header to launch your updated stack!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botConfirmMsg]);
      addConsoleLog(`[SUCCESS] Executed fix solution command: ${msg.recommendedCommand}`);
    } catch (err: any) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `Error executing fix command: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMsg]);
      addConsoleLog(`[ERROR] Solution execution failed: ${err.message}`);
    } finally {
      setIsExecutingFix(false);
    }
  };

  return (
    <div className={`absolute bottom-4 right-4 z-40 w-96 sm:w-[420px] ${isMinimized ? 'h-auto' : 'h-[520px]'} bg-[#1a1614] border-2 border-[#ff7b00]/60 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden font-sans transition-all duration-300`}>
      {/* Chatbot Header */}
      <div className="bg-[#241e1b] border-b border-[#3a312c] px-4 py-3 flex items-center justify-between select-none">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#ff7b00]/10 text-[#ff7b00] rounded-lg border border-[#ff7b00]/30 shadow-sm">
            <Bot className="w-5 h-5 text-[#ff7b00]" />
          </div>
          <div>
            <h3 className="font-extrabold text-[14px] text-[#ff7b00] uppercase tracking-wider flex items-center gap-1.5">
              AI STACK ARCHITECT
            </h3>
            <p className="text-[10px] text-[#a3958c] font-mono">
              {isMinimized ? 'Minimized • Click arrow to expand' : 'Interactive Conversational Assistant'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-[#a3958c] hover:text-[#ff7b00] p-1 rounded-lg hover:bg-[#322a26] transition cursor-pointer"
            title={isMinimized ? "Expand AI Architect" : "Minimize AI Architect"}
          >
            {isMinimized ? <ChevronUp className="w-4.5 h-4.5 text-[#ff7b00]" /> : <ChevronDown className="w-4.5 h-4.5" />}
          </button>
          <button
            onClick={() => setIsAiModalOpen(false)}
            className="text-[#a3958c] hover:text-[#f0e8e2] p-1 rounded-lg hover:bg-[#322a26] transition cursor-pointer"
            title="Close AI Architect"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Quick Action Shortcuts */}

      {/* Quick Action Shortcuts */}
      <div className="bg-[#161210] border-b border-[#3a312c] p-2 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
        <button
          onClick={handleAnalyzeLogs}
          className="shrink-0 px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 font-bold transition flex items-center gap-1 cursor-pointer"
          title="Analyze active console error logs"
        >
          <Activity className="w-3 h-3 text-red-400" />
          Analyse Logs
        </button>
        <button
          onClick={handleInspectGraph}
          className="shrink-0 px-2.5 py-1 rounded-md bg-[#ff7b00]/10 text-[#ff7b00] border border-[#ff7b00]/30 hover:bg-[#ff7b00]/20 font-bold transition flex items-center gap-1 cursor-pointer"
        >
          <FileText className="w-3 h-3" />
          Inspect Canvas ({nodes.length})
        </button>
        <button
          onClick={() => handleSendMessage('React frontend, Node.js backend, and PostgreSQL database on app-network')}
          className="shrink-0 px-2 py-1 rounded bg-[#241e1b] text-[#a3958c] border border-[#3a312c] hover:text-[#f0e8e2] transition cursor-pointer"
        >
          ⚡ React + Node + Postgres
        </button>
      </div>

      {/* Message History */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#120f0e] text-[12px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
              msg.sender === 'user' ? 'bg-[#ff7b00] text-black' : 'bg-[#241e1b] text-[#ff7b00] border border-[#3a312c]'
            }`}>
              {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div className={`max-w-[85%] p-3 rounded-2xl ${
              msg.sender === 'user' 
                ? 'bg-[#ff7b00]/20 text-[#f0e8e2] border border-[#ff7b00]/40 rounded-tr-none' 
                : 'bg-[#1a1614] text-[#e8dfd8] border border-[#3a312c] rounded-tl-none shadow-md'
            }`}>
              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              
              {/* Executable Solution Button */}
              {msg.recommendedCommand && !msg.isSolutionExecuted && (
                <div className="mt-3 pt-2.5 border-t border-[#3a312c]">
                  <button
                    onClick={() => handleExecuteSolution(msg)}
                    disabled={isExecutingFix}
                    className="w-full px-3 py-2 rounded-xl bg-[#ff7b00] hover:bg-[#e06c00] text-black font-extrabold text-[11px] font-mono tracking-wider uppercase transition shadow-[0_0_15px_rgba(255,123,0,0.4)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    {isExecutingFix ? 'EXECUTING SOLUTION...' : `IMPLEMENT SOLUTION (${msg.recommendedCommand})`}
                  </button>
                </div>
              )}

              {msg.isSolutionExecuted && (
                <div className="mt-2 text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Solution executed on host system
                </div>
              )}

              {msg.suggestedGraph && msg.hasIssues && (
                <div className="mt-3 pt-2.5 border-t border-[#3a312c]">
                  <button
                    onClick={() => {
                      if (msg.suggestedGraph) {
                        setPreviousGraph({ nodes: [...nodes], edges: [...edges] });
                        loadPreset(msg.suggestedGraph.nodes, msg.suggestedGraph.edges);
                        addConsoleLog('[AI CHATBOT] Applied AI-suggested audit fixes to canvas.');
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-[11px] font-mono tracking-wider uppercase transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    APPLY AUDIT FIXES TO CANVAS
                  </button>
                </div>
              )}

              {msg.nodesCount && (
                <div className="mt-2 pt-2 border-t border-[#3a312c] space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    Canvas layout updated with {msg.nodesCount} nodes
                  </div>
                  {msg.hasRevertOption && previousGraph && (
                    <button
                      onClick={handleRevertGraph}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-[#ff7b00]/15 hover:bg-[#ff7b00]/25 text-[#ff7b00] border border-[#ff7b00]/40 text-[11px] font-mono font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      REVERT TO PREVIOUS GRAPH
                    </button>
                  )}
                </div>
              )}
              <span className="block text-[9px] font-mono text-[#a3958c] text-right mt-1 opacity-70">
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-[#ff7b00] font-mono text-[11px] bg-[#1a1614] p-3 rounded-xl border border-[#3a312c] w-max">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Architect is generating graph...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Message Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="bg-[#1a1614] border-t border-[#3a312c] p-2.5 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder="Type your system requirements..."
          className="flex-1 bg-[#241e1b] border border-[#3a312c] rounded-xl px-3 py-2 text-[12px] text-[#f0e8e2] font-mono focus:border-[#ff7b00] focus:outline-none"
        />
        <button
          type="submit"
          disabled={!inputPrompt.trim() || isLoading}
          className="p-2.5 bg-[#ff7b00] hover:bg-[#e06c00] text-black font-bold rounded-xl disabled:opacity-40 transition shadow-[0_0_12px_rgba(255,123,0,0.3)]"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
        </>
      )}
    </div>
  );
};
