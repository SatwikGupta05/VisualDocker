import React, { useState } from 'react';
import { FileText, Copy, Download, Check, X, Code2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface GeneratedFilesModalProps {
  inline?: boolean;
}

export const GeneratedFilesModal: React.FC<GeneratedFilesModalProps> = ({ inline = false }) => {
  const { generatedYaml, generatedFiles, setIsYamlOpen } = useAppStore();

  const files = generatedFiles.length > 0 ? generatedFiles : [
    { filename: 'docker-compose.yml', language: 'yaml', content: generatedYaml || '# No YAML generated yet.' }
  ];

  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeFile = files[activeFileIndex] || files[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    const element = document.createElement('a');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(blob);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const content = (
    <div className={`w-full ${inline ? 'h-full flex flex-col justify-between' : 'max-w-3xl'} bg-[#1a1614] border-2 border-[#3a312c] rounded-2xl p-6 shadow-2xl space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#3a312c] pb-3">
        <div>
          <h3 className="font-extrabold text-[15px] text-[#f0e8e2] uppercase tracking-wider flex items-center gap-2">
            <Code2 className="w-5 h-5 text-amber-400" />
            GENERATED CONFIGURATION FILES ({files.length})
          </h3>
          <p className="text-[11px] text-[#a3958c] font-mono mt-0.5">
            Graph-derived configuration files ready for deployment
          </p>
        </div>
        {!inline && (
          <button 
            onClick={() => setIsYamlOpen(false)} 
            className="text-[#a3958c] hover:text-[#f0e8e2] p-1 rounded-lg hover:bg-[#241e1b] transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

        {/* File Tabs Navigation */}
        <div className="flex items-center gap-2 border-b border-[#3a312c] pb-2 overflow-x-auto">
          {files.map((file, idx) => (
            <button
              key={file.filename}
              onClick={() => setActiveFileIndex(idx)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-[12px] font-bold border transition ${
                activeFileIndex === idx
                  ? 'bg-[#ff7b00]/10 text-[#ff7b00] border-[#ff7b00]/40 shadow-sm'
                  : 'bg-[#241e1b] text-[#a3958c] border-[#3a312c] hover:text-[#f0e8e2] hover:bg-[#2e2723]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              {file.filename}
            </button>
          ))}
        </div>

        {/* Code Content View */}
        <div className="relative group">
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#241e1b] hover:bg-[#322a26] border border-[#3a312c] text-[#f0e8e2] rounded-md text-[11px] font-bold uppercase transition"
              title="Copy content"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              {copied ? 'COPIED' : 'COPY'}
            </button>
            <button
              onClick={() => handleDownload(activeFile.filename, activeFile.content)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff7b00] hover:bg-[#e06c00] text-black rounded-md text-[11px] font-extrabold uppercase transition"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
              DOWNLOAD
            </button>
          </div>

          <pre className="bg-[#120f0e] border border-[#3a312c] p-4 pt-12 rounded-xl font-code text-[12px] text-amber-300 overflow-x-auto max-h-96 leading-relaxed">
            {activeFile.content}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-[#a3958c] font-mono">
            Showing <strong className="text-amber-400">{activeFile.filename}</strong> ({activeFile.language})
          </span>
          {!inline && (
            <button
              onClick={() => setIsYamlOpen(false)}
              className="px-5 py-2 bg-[#241e1b] hover:bg-[#322a26] border border-[#3a312c] text-[#f0e8e2] font-extrabold rounded-lg text-[12px] uppercase transition"
            >
              CLOSE
            </button>
          )}
        </div>
      </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      {content}
    </div>
  );
};
