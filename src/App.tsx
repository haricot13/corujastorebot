import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Clock,
  TrendingUp,
  Cpu,
  Power,
  RefreshCw,
  QrCode,
  Shield,
  HelpCircle,
  Play,
  Send,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

import { MetricCard } from './components/MetricCard';
import { TerminalLogs } from './components/TerminalLogs';
import { ChatSimulator } from './components/ChatSimulator';
import { TriggerManager } from './components/TriggerManager';
import { GroupConfigurator } from './components/GroupConfigurator';
import { BotSetupManager } from './components/BotSetupManager';

import { Trigger, LogEntry, BotStats } from './types';
import {
  INITIAL_STATS
} from './mockData';

export default function App() {
  // Main states synced with Backend
  const [botActive, setBotActive] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<BotStats>({
    messagesSent: 0,
    activeChats: 0,
    avgResponseTime: 0.4,
    conversionRate: 100
  });

  // Phone input and pairing codes state
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [qrType, setQrType] = useState<'qr' | 'pairing'>('pairing');
  const [qrCountdown, setQrCountdown] = useState<number>(120);
  const [qrImageUri, setQrImageUri] = useState<string>('');
  const [isLogsPaused, setIsLogsPaused] = useState<boolean>(false);

  const qrCodeDataRef = useRef(qrCodeData);
  const qrCountdownRef = useRef(qrCountdown);

  useEffect(() => {
    qrCodeDataRef.current = qrCodeData;
    qrCountdownRef.current = qrCountdown;
  }, [qrCodeData, qrCountdown]);

  // Broadcast campaign states
  const [broadcastTarget, setBroadcastTarget] = useState<string>('');
  const [broadcastMessage, setBroadcastMessage] = useState<string>('');
  const [broadcastLoading, setBroadcastLoading] = useState<boolean>(false);
  const [broadcastStatus, setBroadcastStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [broadcastError, setBroadcastError] = useState<string>('');

  // Fetch triggers from bot config JSON on mount
  const fetchTriggers = async () => {
    try {
      const res = await fetch('/api/triggers');
      if (res.ok) {
        const data = await res.json();
        setTriggers(data.triggers);
        setStats(prev => ({ ...prev, activeChats: data.triggers.length > 0 ? 1 : 0 }));
      }
    } catch (err) {
      console.error('Falha ao obter gatilhos do bot:', err);
    }
  };

  useEffect(() => {
    fetchTriggers();
  }, []);

  // Poll server-side state (Active status, Connection State, pairing code logs)
  useEffect(() => {
    const fetchStatusAndLogs = async () => {
      try {
        const resStatus = await fetch('/api/status');
        if (resStatus.ok) {
          const data = await resStatus.json();
          // Avoid disrupting local toggles before server resolves
          setBotActive(data.botActive);
          setConnectionStatus(data.connectionStatus);
          // Only update pairing code / QR if received from backend
          if (data.qrCodeData) {
            setQrType(data.qrType || 'pairing');
            if (data.qrCodeData !== qrCodeDataRef.current || qrCountdownRef.current <= 0) {
              setQrCodeData(data.qrCodeData);
              setQrCountdown(120);
            }
            if (data.qrImageUri) {
              setQrImageUri(data.qrImageUri);
            }
          } else {
            setQrCodeData('');
            setQrImageUri('');
          }
        }

        if (!isLogsPaused) {
          const resLogs = await fetch('/api/logs');
          if (resLogs.ok) {
            const data = await resLogs.json();
            setLogs(data.logs);
          }
        }
      } catch (err) {
        console.error('Erro de sincronização com o barramento do servidor:', err);
      }
    };

    fetchStatusAndLogs();
    const interval = setInterval(fetchStatusAndLogs, 4000); // short polling interval
    return () => clearInterval(interval);
  }, [isLogsPaused]);

  // QR Code expiration countdown timer
  useEffect(() => {
    if (connectionStatus !== 'connecting' || !qrCodeData) return;

    if (qrCountdown <= 0) {
      setQrCodeData('');
      setQrImageUri('');
      addLogEntry('Código ou QR de pareamento expirado. Atualize para renovar.', 'warning');
      return;
    }

    const timer = setTimeout(() => {
      setQrCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [connectionStatus, qrCountdown, qrCodeData]);

  // State log register helper (client-side backup info)
  const addLogEntry = (text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const timeStr = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const newLog: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: timeStr,
      type,
      text
    };

    setLogs(prev => {
      const updated = [...prev, newLog];
      return updated.slice(-100);
    });
  };

  // Toggle Bot Status
  const handleToggleBot = async () => {
    const nextState = !botActive;
    try {
      const res = await fetch('/api/toggle-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextState })
      });
      if (res.ok) {
        setBotActive(nextState);
        addLogEntry(
          nextState 
            ? 'Ordem de ativação do Coruja Store Bot enviada. Carregando componentes do chatbot...'
            : 'Sessão do Coruja Store Bot pausada. Gatilhos de resposta e disparos suspensos.',
          nextState ? 'success' : 'warning'
        );
      }
    } catch (err) {
      console.error('Erro ao alternar suspensão do bot:', err);
    }
  };

  // Trigger web pairing with Baileys
  const handleRequestPairing = async () => {
    if (!phoneInput.trim()) {
      alert('Por favor, informe o número de telefone com código do país e DDD.');
      return;
    }

    setConnectionStatus('connecting');
    addLogEntry(`Solicitando pareamento ao WhatsApp para o número ${phoneInput}...`, 'info');
    
    try {
      const res = await fetch('/api/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneInput })
      });
      const data = await res.json();
      if (res.ok) {
        setQrCodeData(data.code);
        setQrType('pairing');
        setQrCountdown(120);
        addLogEntry(`Código de pareamento alfanumérico gerado com sucesso: ${data.code}`, 'success');
      } else {
        alert(data.error || 'Falha ao obter código de pareamento.');
        setConnectionStatus('disconnected');
      }
    } catch (err) {
      console.error('Erro ao requisitar pareamento:', err);
      setConnectionStatus('disconnected');
    }
  };

  // Disconnect active WhatsApp session
  const handleDisconnectBot = async () => {
    try {
      const res = await fetch('/api/toggle-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false })
      });
      if (res.ok) {
        setBotActive(false);
        setConnectionStatus('disconnected');
        setQrCodeData('');
        addLogEntry('A conexão com o WhatsApp foi encerrada e desvinculada do painel.', 'warning');
      }
    } catch (err) {
      console.error('Falha ao desconectar o bot:', err);
    }
  };

  // Completely reset WhatsApp connection credentials folder
  const handleResetSession = async () => {
    if (!window.confirm('Tem certeza que deseja RESETAR completamente a conexão com o WhatsApp? Esta ação apagará todas as credenciais locais e forçará uma reconexão limpa.')) {
      return;
    }
    try {
      addLogEntry('Solicitando reset completo da sessão ao servidor...', 'info');
      const res = await fetch('/api/reset-session', {
        method: 'POST'
      });
      if (res.ok) {
        setBotActive(false);
        setConnectionStatus('disconnected');
        setQrCodeData('');
        addLogEntry('Sessão resetada com sucesso! Você pode iniciar uma nova conexão.', 'success');
      } else {
        const data = await res.json();
        alert(data.error || 'Falha ao resetar sessão.');
      }
    } catch (err) {
      console.error('Falha ao resetar sessão:', err);
    }
  };

  // Send purchase notifications or marketing message dispatch loops
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTarget.trim() || !broadcastMessage.trim()) {
      alert('Preencha os campos de destino e mensagem.');
      return;
    }

    setBroadcastLoading(true);
    setBroadcastStatus('idle');
    setBroadcastError('');

    try {
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: broadcastTarget, message: broadcastMessage })
      });
      const data = await res.json();
      if (res.ok) {
        setBroadcastStatus('success');
        setBroadcastMessage('');
        addLogEntry(`Notificação enviada com sucesso para: ${broadcastTarget}`, 'success');
        setStats(prev => ({ ...prev, messagesSent: prev.messagesSent + 1 }));
      } else {
        setBroadcastStatus('error');
        setBroadcastError(data.error || 'Erro desconhecido ao realizar o disparo.');
        addLogEntry(`Falha ao disparar mensagem para ${broadcastTarget}: ${data.error}`, 'error');
      }
    } catch (err) {
      setBroadcastStatus('error');
      setBroadcastError('Não foi possível obter comunicação com o servidor.');
    } finally {
      setBroadcastLoading(false);
    }
  };

  // CRUD actions for Triggers (backed-up on system files)
  const handleAddTrigger = async (newT: Omit<Trigger, 'id'>) => {
    try {
      const res = await fetch('/api/triggers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: newT.keyword, reply: newT.reply })
      });
      if (res.ok) {
        addLogEntry(`Novo gatilho cadastrado no banco: "${newT.keyword}"`, 'success');
        fetchTriggers();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao cadastrar novo gatilho.');
      }
    } catch (err) {
      console.error('Erro de API ao adicionar gatilho:', err);
    }
  };

  const handleToggleTrigger = (id: string) => {
    // Interactive client-side helper to display interface click feedback (toggles visibility tag)
    setTriggers(prev =>
      prev.map(t => {
        if (t.id === id) {
          const nextActive = !t.isActive;
          addLogEntry(`Gatilho local "${t.keyword}" foi marcado como ${nextActive ? 'ativo' : 'pausado'}.`, nextActive ? 'info' : 'warning');
          return { ...t, isActive: nextActive };
        }
        return t;
      })
    );
  };

  const handleDeleteTrigger = async (id: string) => {
    const target = triggers.find(t => t.id === id);
    if (!target) return;

    try {
      const res = await fetch(`/api/triggers?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        addLogEntry(`Gatilho "${target.keyword}" foi removido do banco do robô.`, 'warning');
        fetchTriggers();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao deletar gatilho.');
      }
    } catch (err) {
      console.error('Erro de API ao remover gatilho:', err);
    }
  };

  const handleUpdateTrigger = async (id: string, updatedReply: string, updatedKeyword: string) => {
    try {
      const res = await fetch('/api/triggers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, keyword: updatedKeyword, reply: updatedReply })
      });
      if (res.ok) {
        addLogEntry(`Gatilho "${updatedKeyword}" foi atualizado com sucesso.`, 'info');
        fetchTriggers();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao atualizar o gatilho.');
      }
    } catch (err) {
      console.error('Erro de API ao atualizar gatilho:', err);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-amber-400 selection:text-slate-900 justify-center">
      
      {/* 🖥 Core Main View Area containing Header & Bento Dashboard Grid */}
      <div className="w-full max-w-7xl flex flex-col min-w-0">
        
        {/* 🪐 Header Brand Area with Blur effect */}
        <header className="h-20 border-b border-slate-900/80 flex items-center justify-between px-6 sm:px-10 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-display">
              Coruja Store<span className="text-amber-500">Bot</span>
            </h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold font-mono">
              Painel do Administrador
            </p>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            {/* Active Status Badge tag */}
            <div className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full border ${
              connectionStatus === 'connected' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                : connectionStatus === 'connecting'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                  : 'bg-slate-800 border-slate-705 text-slate-500'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${
                connectionStatus === 'connected' 
                  ? 'bg-emerald-500 animate-pulse' 
                  : connectionStatus === 'connecting' 
                    ? 'bg-amber-500 animate-bounce' 
                    : 'bg-slate-600'
              }`}></div>
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                {connectionStatus === 'connected' ? 'CONECTADO' : connectionStatus === 'connecting' ? 'CONECTANDO' : 'DESCONECTADO'}
              </span>
            </div>

            <button
              onClick={handleToggleBot}
              className={`text-slate-950 text-xs sm:text-sm font-bold px-4 sm:px-6 py-2 rounded-lg transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-2 ${
                botActive 
                  ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 shadow-none border border-slate-700'
              }`}
            >
              <Power size={13} />
              <span>{botActive ? 'Pausar Bot' : 'Iniciar Bot'}</span>
            </button>
          </div>
        </header>

        {/* 🚀 Scrollable Core Body Platform */}
        <main className="p-6 sm:p-10 flex-1 space-y-8 overflow-y-auto">
          
          {/* Connection Handshake Controller Wizard */}
          <AnimatePresence mode="popLayout">
            {connectionStatus !== 'connected' && (
              <motion.div
                initial={{ height: 0, opacity: 0, y: -20 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -20 }}
                className="rounded-2xl bg-slate-900 border-2 border-dashed border-amber-500/20 overflow-hidden shadow-lg p-6"
              >
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                  
                  {/* Pair wizard guidelines */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping inline-block" />
                      <h3 className="font-bold text-base sm:text-lg text-amber-400 uppercase font-display select-none">
                        CONECTAR COM WHATSAPP (APARELHOS CONECTADOS)
                      </h3>
                    </div>
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl font-light">
                      O <strong>Coruja Store Bot</strong> roda integrado no servidor. Para parear seu WhatsApp, você pode escanear o <strong>QR Code instantâneo</strong> à direita ou, se preferir, digitar seu número celular com código do país e DDD (Ex: 5511999999999) para conectar via <strong>Código de Pareamento</strong>.
                    </p>
                    
                    {connectionStatus === 'disconnected' ? (
                      <div className="flex flex-col space-y-3">
                        <div className="text-[11px] font-mono text-slate-400">
                          👉 Para escanear o QR Code, primeiro clique em <strong className="text-amber-500">Iniciar Bot</strong> no cabeçalho.
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <div className="relative flex-1 max-w-xs">
                            <input
                              type="text"
                              placeholder="Celular Ex: 5511999999999"
                              required
                              value={phoneInput}
                              onChange={(e) => setPhoneInput(e.target.value)}
                              className="bg-slate-950 border border-slate-800 focus:border-amber-500 text-slate-200 text-xs rounded-xl px-4 py-2.5 w-full focus:outline-hidden transition"
                            />
                          </div>
                          <button
                            onClick={handleRequestPairing}
                            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-amber-500/15 cursor-pointer shrink-0"
                          >
                            <QrCode size={16} />
                            <span>OBTER CÓDIGO DO CELULAR</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="px-3.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center gap-2 shadow-inner">
                          <RefreshCw size={12} className="animate-spin text-amber-400" />
                          <span>Aguardando WhatsApp... Expira em: <strong className="text-amber-500">{qrCountdown}s</strong></span>
                        </div>
                        <button
                          onClick={handleDisconnectBot}
                          className="px-4 py-2 rounded-lg bg-transparent text-slate-400 border border-slate-800 text-xs hover:text-white hover:border-slate-700 transition cursor-pointer"
                        >
                          Cancelar Conexão
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Dynamic QR Code & Pairing Code Representation */}
                  {connectionStatus === 'connecting' && qrCodeData && (
                    <motion.div
                      key="active-qr"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-5 bg-slate-950 border border-slate-850 rounded-2xl flex flex-col items-center gap-3 shadow-xl select-none border-amber-500/20 shrink-0 w-64 text-center"
                    >
                      {qrType === 'qr' ? (
                        <>
                          <div className="text-emerald-400 font-bold text-[9px] font-mono tracking-widest leading-none bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded uppercase font-sans">
                            ESCANEIE O QR CODE
                          </div>
                          
                          <div className="p-2.5 bg-white rounded-xl shadow-inner my-1">
                            <img 
                              src={qrImageUri || `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrCodeData)}&size=160x160`}
                              alt="WhatsApp QR Code"
                              className="w-[160px] h-[160px] block"
                              referrerPolicy="no-referrer"
                            />
                          </div>
    
                          <p className="text-[10px] text-slate-400 font-mono leading-normal">
                            Abra o WhatsApp &gt; <strong>Aparelhos Conectados</strong> &gt; Conectar um aparelho.
                          </p>

                          <div className="w-full border-t border-slate-850/80 my-1 pt-2">
                            <a
                              href="/qr"
                              target="_blank"
                              rel="noreferrer"
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider transition active:scale-95 shadow-md shadow-amber-500/15 cursor-pointer"
                            >
                              <ExternalLink size={13} />
                              <span>LINK DIRETO DO QR</span>
                            </a>
                            <p className="text-[9px] text-amber-500/80 font-medium mt-1 leading-tight">
                              Evite erros! Abra em tela cheia no computador ou celular.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-amber-400 font-bold text-[9px] font-mono tracking-widest leading-none bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded uppercase font-sans">
                            CÓDIGO DE PAREAMENTO REAL
                          </div>
                          
                          <div className="py-4 px-3 bg-slate-900 border border-amber-500/30 rounded-xl text-center w-full">
                            <span className="font-mono text-xl sm:text-2xl font-extrabold tracking-widest text-white block">
                              {qrCodeData}
                            </span>
                          </div>
    
                          <p className="text-[10px] text-slate-400 font-mono leading-normal">
                            Digite no seu WhatsApp em:<br/><strong>Aparelhos Conectados &gt; Conectar com número de telefone</strong>
                          </p>
                        </>
                      )}
                    </motion.div>
                  )}

                  {connectionStatus === 'connecting' && !qrCodeData && (
                    <motion.div
                      key="loading-qr"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-5 bg-slate-950 border border-slate-850 rounded-2xl flex flex-col items-center justify-center gap-4 shadow-xl border-amber-500/20 shrink-0 w-64 h-[280px] text-center"
                    >
                      <RefreshCw size={28} className="animate-spin text-amber-500" />
                      <div>
                        <div className="text-amber-500 font-bold text-[9px] font-mono tracking-widest leading-none bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded uppercase font-sans mb-1">
                          GERANDO CONEXÃO
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">Buscando do WhatsApp...</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-sans leading-relaxed px-1">
                        Iniciando motor Baileys do servidor. Aguarde alguns segundos para obter o QR Code ou código.
                      </p>
                    </motion.div>
                  )}

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 📊 Top Stats Cards Row */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              id="m-1"
              title="Disparos na Sessão"
              value={stats.messagesSent.toLocaleString('pt-BR')}
              change="Cliques no simulador"
              isPositive={true}
              icon={<MessageSquare size={16} />}
            />
            <MetricCard
              id="m-2"
              title="Gatilhos Ativos"
              value={triggers.length}
              change="Respostas cadastradas"
              isPositive={true}
              icon={<Cpu size={16} />}
            />
            <MetricCard
              id="m-3"
              title="Tempo de Resposta"
              value={`${stats.avgResponseTime}s`}
              change="Websocket direto"
              isPositive={true}
              icon={<Clock size={16} />}
            />
            <MetricCard
              id="m-4"
              title="Engine de Conexão"
              value="Baileys MD"
              change="Conectado via Socket"
              isPositive={true}
              icon={<TrendingUp size={16} />}
            />
          </section>

          {/* 🧭 Bento Layout Grid System */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Group controls, API & configuration (covers span 5) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* WhatsApp Active Configuration status card */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex items-center justify-between shadow-lg">
                <div>
                  <h4 className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Servidor WhatsApp</h4>
                  <div className="mt-1 flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-emerald-500' :
                      connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                    }`} />
                    <span className="font-semibold text-sm font-display text-white">
                      {connectionStatus === 'connected' ? 'WhatsApp API Online' :
                       connectionStatus === 'connecting' ? 'Sincronizando...' : 'Dispositivo Desconectado'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {connectionStatus === 'connected' ? (
                    <button
                      onClick={handleDisconnectBot}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-mono transition cursor-pointer animate-fade-in"
                    >
                      Desconectar
                    </button>
                  ) : null}
                  <button
                    onClick={handleResetSession}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-amber-500/10 text-slate-400 hover:text-amber-500 border border-slate-850 text-xs font-mono transition cursor-pointer"
                    title="Limpar cache de pareamento do Baileys para resolver travamentos de conexão"
                  >
                    Resetar Sessão
                  </button>
                </div>
              </div>

              {/* 🛠 Real Group Rules and Settings Manager */}
              <GroupConfigurator onBotAction={addLogEntry} />

              {/* 🚀 REAL BROADCAST CENTER: Send purchase notifications or marketing messages */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Send size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Central de Disparos de Notificações</h3>
                    <p className="text-[10px] text-slate-400">Envie alertas de compras, links e marketing institucional</p>
                  </div>
                </div>

                <form onSubmit={handleSendBroadcast} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase">
                      Destinatário (Número ou ID do Grupo)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 5511999999999 ou 120363290@g.us"
                      value={broadcastTarget}
                      onChange={(e) => setBroadcastTarget(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-hidden transition shadow-inner font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase">
                      Mensagem de Notificação
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Gostaria de avisar que seu pedido #1042 foi concluído com sucesso! 🪐"
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-slate-200 text-xs rounded-lg p-3 focus:outline-hidden transition shadow-inner"
                    />
                  </div>

                  {broadcastStatus === 'success' && (
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                      <CheckCircle size={14} className="shrink-0" />
                      <span>Mensagem enviada com sucesso ao servidor!</span>
                    </div>
                  )}

                  {broadcastStatus === 'error' && (
                    <div className="p-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg flex items-center gap-2">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span className="truncate">{broadcastError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={broadcastLoading || connectionStatus !== 'connected'}
                    className={`w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 ${
                      connectionStatus === 'connected'
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md cursor-pointer'
                        : 'bg-slate-800 text-slate-500 border border-slate-750 cursor-not-allowed'
                    }`}
                  >
                    {broadcastLoading ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Send size={13} />
                    )}
                    <span>{connectionStatus === 'connected' ? 'Disparar Notificação' : 'Conecte o WhatsApp para disparar'}</span>
                  </button>
                </form>
              </div>

            </div>

            {/* Right Column: Chat simulator & Auto triggers (covers span 7) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Simulation chat panel container */}
              <ChatSimulator
                triggers={triggers}
                botActive={botActive}
                onBotAction={addLogEntry}
                onIncrementSentCount={() => setStats(prev => ({ ...prev, messagesSent: prev.messagesSent + 1 }))}
              />

              <TriggerManager
                triggers={triggers}
                onAddTrigger={handleAddTrigger}
                onToggleTrigger={handleToggleTrigger}
                onDeleteTrigger={handleDeleteTrigger}
                onUpdateTrigger={handleUpdateTrigger}
              />
            </div>

          </div>

          {/* ⚙ Bot setup configuration & Command text script Editor */}
          <div className="w-full">
            <BotSetupManager onBotAction={addLogEntry} />
          </div>

          {/* ⌨ Live system debugging feed */}
          <TerminalLogs
            logs={logs}
            isPaused={isLogsPaused}
            onTogglePause={() => {
              const next = !isLogsPaused;
              setIsLogsPaused(next);
              addLogEntry(`Apresentação de novos logs de console foi ${next ? 'PAUSADA' : 'RETOMADA'}.`, next ? 'warning' : 'info');
            }}
            onClearLogs={() => setLogs([])}
          />

        </main>

        {/* 🔒 Sophisticated Secure Branding Footer */}
        <footer className="max-w-7xl mx-auto px-6 sm:px-10 py-6 border-t border-slate-900/40 text-center flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 font-mono w-full">
          <div className="flex items-center gap-1.5">
            <Shield size={12} className="text-amber-500/70" />
            <span>© 2026 Admin — Coruja Store Bot Integrator Engine. Todos os direitos reservados.</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hover:text-amber-400 cursor-help flex items-center gap-1">
              <HelpCircle size={10} />
              Sleek Ecosystem
            </span>
            <span>•</span>
            <span className="text-emerald-500 font-bold animate-pulse">● PRODUÇÃO ONLINE</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
