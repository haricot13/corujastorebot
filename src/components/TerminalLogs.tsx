import React, { useRef, useEffect } from 'react';
import { Terminal, Shield, RefreshCw, Trash2, Pause, Play } from 'lucide-react';
import { LogEntry } from '../types';

interface TerminalLogsProps {
  logs: LogEntry[];
  isPaused: boolean;
  onTogglePause: () => void;
  onClearLogs: () => void;
}

export const TerminalLogs: React.FC<TerminalLogsProps> = ({
  logs,
  isPaused,
  onTogglePause,
  onClearLogs
}) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPaused && terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  return (
    <div className="flex flex-col h-full rounded-2xl bg-zinc-950 border border-slate-900/40 shadow-2xl overflow-hidden">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 block" />
          </div>
          <span className="text-xs text-zinc-400 font-mono flex items-center gap-1.5 ml-2">
            <Terminal size={12} className="text-amber-400" />
            takeshi-bot@api_terminal ~ monitor_whatsapp
          </span>
        </div>
        
        {/* Logs Control Panel */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePause}
            className={`p-1.5 rounded-md hover:bg-zinc-800 transition-colors duration-200 text-xs flex items-center gap-1 font-mono ${
              isPaused ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-400'
            }`}
            title={isPaused ? 'Retomar Logs' : 'Pausar Logs'}
          >
            {isPaused ? <Play size={12} /> : <Pause size={12} />}
            <span className="hidden sm:inline">{isPaused ? 'RESUME' : 'PAUSE'}</span>
          </button>
          
          <button
            onClick={onClearLogs}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-red-400/80 hover:text-red-400 transition-colors duration-200 text-xs flex items-center gap-1 font-mono"
            title="Limpar Console"
          >
            <Trash2 size={12} />
            <span className="hidden sm:inline">CLEAR</span>
          </button>
        </div>
      </div>

      {/* Terminal Content Screen */}
      <div 
        ref={terminalContainerRef}
        className="p-4 flex-1 overflow-y-auto max-h-[280px] min-h-[180px] font-mono text-xs select-none"
      >
        <div className="space-y-1.5">
          {logs.length === 0 ? (
            <div className="text-zinc-500 italic text-center py-8">
              Nenhuma atividade registrada no momento. Ative o bot para iniciar o monitoramento.
            </div>
          ) : (
            logs.map((log) => {
              let badgeColor = 'text-blue-400';
              let typeLabel = '[INFO]';
              
              if (log.type === 'success') {
                badgeColor = 'text-emerald-400';
                typeLabel = '[OK]';
              } else if (log.type === 'warning') {
                badgeColor = 'text-amber-400';
                typeLabel = '[WARN]';
              } else if (log.type === 'error') {
                badgeColor = 'text-rose-500 font-bold';
                typeLabel = '[FAIL]';
              }

              return (
                <div key={log.id} className="flex items-start gap-2 hover:bg-zinc-900/50 py-0.5 px-1 rounded transition-colors">
                  <span className="text-zinc-600 shrink-0">{log.timestamp}</span>
                  <span className={`${badgeColor} shrink-0 w-[42px]`}>{typeLabel}</span>
                  <span className="text-zinc-300 break-all">{log.text}</span>
                </div>
              );
            })
          )}
          
          {!isPaused && (
            <div className="flex items-center gap-1.5 text-zinc-500 pt-1">
              <span className="w-1.5 h-3 bg-amber-400 animate-pulse inline-block" />
              <span className="text-[10px] animate-pulse">Escutando eventos em tempo real...</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Security Status Bar */}
      <div className="bg-zinc-900 px-4 py-1.5 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
        <div className="flex items-center gap-1.5">
          <Shield size={10} className="text-emerald-500" />
          <span>AES-256 E2E Encryption Ativa</span>
        </div>
        <span>Thread: WwebJS-Engine v2.1</span>
      </div>
    </div>
  );
};
