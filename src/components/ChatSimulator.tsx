import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, CheckCheck, Smile, Paperclip, MoreVertical, Phone, Video, HelpCircle } from 'lucide-react';
import { Message, Trigger } from '../types';

interface ChatSimulatorProps {
  triggers: Trigger[];
  botActive: boolean;
  onBotAction: (logText: string, logType: 'info' | 'success' | 'warning' | 'error') => void;
  onIncrementSentCount: () => void;
}

const QUICK_SUGGESTIONS = [
  { label: 'Oi 🪐', query: 'Oi' },
  { label: 'Menu ☰', query: '/menu' },
  { label: 'Ping Latência ⚡', query: '/ping' },
  { label: 'Fazer Sticker 🖼️', query: '/sticker' },
  { label: 'Falar c/ Dev 📞', query: '/suporte' }
];

export const ChatSimulator: React.FC<ChatSimulatorProps> = ({
  triggers,
  botActive,
  onBotAction,
  onIncrementSentCount
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'system',
      text: '🪐 Canal de simulação do WhatsApp estabelecido com Coruja Store Bot.',
      timestamp: '16:01'
    },
    {
      id: 'm2',
      sender: 'bot',
      text: 'Olá! Sou seu assistente virtual inteligente *Coruja Store Bot* 🪐.\n\nComo posso ajudar você hoje?\nDigite:\n👉 */menu* — para ver meus comandos disponíveis\n👉 */ping* — para testar a latência do websocket\n👉 */sticker* — para instruções de figurinhas',
      timestamp: '16:02',
      status: 'read'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest messages inside local container ONLY (no scrollIntoView viewport drag bug)
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Match the user's query against our triggers to get a reply
  const getBotResponse = (query: string): string => {
    if (!botActive) {
      return '💤 *[Coruja Store Bot está Inativo]* Ative a chave "Status do Bot" no painel superior para receber minhas respostas automatizadas!';
    }

    const cleanQuery = query.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 1st Priority: Match exact active triggers keywords
    const matchedTrigger = triggers.find(t => {
      if (!t.isActive) return false;
      const cleanKeyword = t.keyword.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return cleanQuery === cleanKeyword || cleanQuery.includes(cleanKeyword);
    });

    if (matchedTrigger) {
      return matchedTrigger.reply;
    }

    // 2nd Priority: Hardcoded real command simulations
    if (cleanQuery === '/menu' || cleanQuery === '/help' || cleanQuery === 'menu') {
      return `╭━━⪩ BEM VINDO! ⪨━━
▢ • Coruja Store Bot
▢ • Data: ${new Date().toLocaleDateString("pt-br")}
▢ • Hora: ${new Date().toLocaleTimeString("pt-br")}
▢ • Versão: v1.1.0
▢
╰━━─「🪐」─━━

╭━━⪩ ADMINS ⪨━━
▢ • /abrir
▢ • /add-auto-responder
▢ • /anti-audio (1/0)
▢ • /anti-link (1/0)
▢ • /anti-sticker (1/0)
▢ • /auto-responder (1/0)
▢ • /auto-sticker (1/0)
▢ • /ban
▢ • /mute
▢ • /unmute
▢ • /welcome (1/0)
▢
╰━━─「⭐」─━━

╭━━⪩ PRINCIPAL ⪨━━
▢ • /sticker
▢ • /to-image
▢ • /to-mp3
▢ • /removebg
▢ • /ping
▢ • /suporte
▢
╰━━─「🚀」─━━

╭━━⪩ IA ⪨━━
▢ • /deepseek
▢ • /gemini
▢ • /gpt-5-mini
▢ • /ia-sticker
▢
╰━━─「🚀」─━━`;
    }

    if (cleanQuery === '/ping' || cleanQuery === 'ping') {
      return '⚡ *PONG!* Latência de resposta do servidor: *42ms*\n💻 Engine: Baileys Multi-Device\n🟢 Status: Operando em alta performance';
    }

    if (cleanQuery === '/suporte' || cleanQuery === 'suporte') {
      return '📞 *CENTRAL DE SUPORTE - CORUJA STORE BOT* 🪐\n\nPrecisa de auxílio técnico, deseja relatar um erro ou obter mais informações sobre o painel?\n\nFale diretamente com nosso desenvolvedor principal!';
    }

    if (cleanQuery.includes('sticker') || cleanQuery.includes('figurinha') || cleanQuery === '/sticker') {
      return '🖼️ *GERADOR DE FIGURINHAS CORUJA STORE BOT* 🪐\n\nPara criar figurinhas:\n1. Envie uma foto ou vídeo curto no chat.\n2. Escreva as palavras-chave */sticker*, */f* ou */fig* no campo de legenda.\n\nO bot irá responder processando e retornando o arquivo em formato de sticker nativo do WhatsApp!';
    }

    if (cleanQuery.startsWith('/gemini') || cleanQuery.startsWith('/deepseek')) {
      return '🤖 *[Inteligência Artificial]* Processando sua requisição... \n\nCoruja Store Bot efetuou a consulta na API com competência. Aqui está a resposta sintetizada para o seu desafio.';
    }

    // Fallback response with bot vibe
    return 'Oooh! 🪐 Desculpe, não captei esse comando. \n\nPara ver todos os comandos funcionais disponíveis no ninho do bot, mande um */menu*!';
  };

  const handleSendMessage = (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: userTime,
      status: 'sent'
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    onBotAction(`Mensagem recebida de cliente no simulador: "${textToSend}"`, 'info');

    // Trigger WhatsApp Double Tick after visual delay
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === userMsg.id ? { ...m, status: 'read' } : m));
    }, 4000);

    // Simulate Bot typing
    setIsTyping(true);

    const typingDelay = Math.max(800, Math.min(1800, textToSend.length * 15));

    setTimeout(() => {
      setIsTyping(false);
      const botReplyText = getBotResponse(textToSend);
      const botTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      setMessages(prev => [...prev, {
        id: `b-${Date.now()}`,
        sender: 'bot',
        text: botReplyText,
        timestamp: botTime
      }]);

      if (botActive) {
        onIncrementSentCount();
        onBotAction(`Coruja Store Bot respondeu com sucesso ao comando: "${textToSend.substring(0, 20)}"`, 'success');
      } else {
        onBotAction(`Coruja Store Bot ignorou mensagem porque está desativado pelo painel.`, 'warning');
      }
    }, typingDelay);
  };

  const formatTextWithBold = (text: string) => {
    const parts = text.split(/(\*[^*]+\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return <strong key={index} className="font-extrabold text-amber-300">{part.slice(1, -1)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-[520px] rounded-2xl bg-zinc-900 border border-zinc-800/80 overflow-hidden gold-glow shadow-xl">
      {/* WhatsApp Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/90 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-linear-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-zinc-950 font-bold text-lg shadow-md select-none">
              🪐
            </div>
            {botActive && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
            )}
          </div>
          <div>
            <h4 className="font-semibold text-sm text-zinc-100 font-display">Coruja Store Bot</h4>
            <p className="text-[10px] text-zinc-400 font-mono">
              {botActive ? '● Online & Monitorando' : '💤 Bot Desativado'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-zinc-400">
          <Video size={16} className="cursor-pointer hover:text-amber-400 transition" />
          <Phone size={16} className="cursor-pointer hover:text-amber-400 transition" />
          <div className="w-[1px] h-4 bg-zinc-800" />
          <MoreVertical size={16} className="cursor-pointer hover:text-amber-400 transition" />
        </div>
      </div>

      {/* WhatsApp Chat Body with custom dark wallpaper */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 p-4 overflow-y-auto space-y-3 relative"
        style={{
          backgroundImage: `radial-gradient(circle at 10% 20%, rgba(24, 24, 27, 0.95) 0%, rgba(9, 9, 11, 0.98) 90%)`,
          backgroundSize: 'cover'
        }}
      >
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

        <div className="relative space-y-3">
          {messages.map((msg) => {
            if (msg.sender === 'system') {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="bg-zinc-950 border border-zinc-800 text-zinc-400 text-[10px] py-1 px-3 rounded-full font-mono text-center">
                    {msg.text}
                  </div>
                </div>
              );
            }

            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl shadow-sm relative leading-relaxed text-sm ${
                    isUser
                      ? 'bg-amber-500 text-zinc-950 rounded-tr-none font-medium'
                      : 'bg-zinc-850 text-zinc-100 rounded-tl-none border border-zinc-800/60'
                  }`}
                >
                  {/* Message bubble tail */}
                  <div
                    className={`absolute top-0 w-2 h-2 ${
                      isUser
                        ? '-right-1.5 bg-amber-500 rounded-br-full'
                        : '-left-1.5 bg-zinc-850 rounded-bl-full border-l border-t border-zinc-800/10'
                    }`}
                  />
                  
                  {/* Formatted body text */}
                  <p className="whitespace-pre-line text-xs sm:text-sm">
                    {isUser ? msg.text : formatTextWithBold(msg.text)}
                  </p>

                  {/* Metadata line (Time + Double Tick) */}
                  <div className="mt-1 flex items-center justify-end gap-1 text-[9px] select-none text-right opacity-80">
                    <span className={isUser ? 'text-zinc-900/60 font-medium' : 'text-zinc-400'}>
                      {msg.timestamp}
                    </span>
                    {isUser && (
                      <CheckCheck
                        size={12}
                        className={msg.status === 'read' ? 'text-blue-500' : 'text-zinc-900/40'}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-zinc-850 text-zinc-100 px-4 py-3 rounded-2xl rounded-tl-none border border-zinc-800/50 shadow-sm flex items-center gap-1.5">
                <span className="text-xs text-zinc-400 italic font-mono">Coruja Store Bot processando</span>
                <span className="flex gap-1 items-center py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suggested Quick clicks for ease of use */}
      <div className="px-3 py-2 bg-zinc-950/70 border-t border-zinc-800/50 flex gap-2 overflow-x-auto select-none shrink-0 no-scrollbar">
        {QUICK_SUGGESTIONS.map((suggestion, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(suggestion.query)}
            className="px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-amber-500/10 border border-zinc-800 hover:border-amber-500/30 text-zinc-300 hover:text-amber-400 text-[11px] font-medium transition whitespace-nowrap active:scale-95"
          >
            {suggestion.label}
          </button>
        ))}
      </div>

      {/* Message Input Bar */}
      <div className="p-3 bg-zinc-950 border-t border-zinc-800/80 flex items-center gap-2.5">
        <button className="text-zinc-400 hover:text-amber-400 transition" title="Emojis (Simulado)">
          <Smile size={20} />
        </button>
        <button className="text-zinc-400 hover:text-amber-400 transition mb-0.5" title="Anexo (Simulado)">
          <Paperclip size={18} />
        </button>
        
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
          placeholder={botActive ? "Mande comandos como /menu, /ping, etc..." : "Bot Inativo no momento"}
          className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-zinc-200 rounded-full px-4 py-1.5 text-sm focus:outline-hidden focus:ring-0 placeholder-zinc-500 transition"
        />

        <button
          onClick={() => handleSendMessage(inputText)}
          disabled={!inputText.trim()}
          className="w-9 h-9 rounded-full bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 flex items-center justify-center transition active:scale-95 hover:bg-amber-400 shrink-0"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
};
