import { Trigger, LogEntry, BotStats } from './types';

// Real default triggers configured to replicate of Coruja Store Bot
export const INITIAL_TRIGGERS: Trigger[] = [
  {
    id: 't1',
    keyword: 'oi',
    reply: 'Olá! Sou o 🪐 *Coruja Store Bot*, assistente inteligente do grupo.\n\nPara ver todos os meus comandos disponíveis, digite:\n👉 */menu* ou */help*',
    isRegex: false,
    isActive: true,
    category: 'Geral'
  },
  {
    id: 't2',
    keyword: 'ajuda',
    reply: 'Olá! Sou o 🪐 *Coruja Store Bot*, assistente inteligente do grupo.\n\nPara ver todos os meus comandos disponíveis, digite:\n👉 */menu* ou */help*',
    isRegex: false,
    isActive: true,
    category: 'Geral'
  },
  {
    id: 't3',
    keyword: '/menu',
    reply: `╭━━⪩ BEM VINDO! ⪨━━
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
╰━━─「🚀」─━━`,
    isRegex: false,
    isActive: true,
    category: 'Menu'
  },
  {
    id: 't4',
    keyword: '/ping',
    reply: '⚡ *PONG!* Latência de resposta do servidor: *42ms*\n💻 Engine: Baileys Multi-Device\n🟢 Status: Operando em alta performance',
    isRegex: false,
    isActive: true,
    category: 'Geral'
  },
  {
    id: 't5',
    keyword: '/suporte',
    reply: '📞 *CENTRAL DE SUPORTE - CORUJA STORE BOT* 🪐\n\nPrecisa de auxílio técnico, deseja relatar um erro ou obter mais informações sobre o painel?\n\nFale diretamente com nosso desenvolvedor principal!',
    isRegex: false,
    isActive: true,
    category: 'Suporte'
  }
];

export const INITIAL_LOG_ENTRIES: LogEntry[] = [
  { id: 'l1', timestamp: '16:01:05', type: 'info', text: 'Iniciando instância autêntica do Coruja Store Bot...' },
  { id: 'l2', timestamp: '16:01:08', type: 'success', text: 'Carregando banco de dados local da pasta database/ com êxito' },
  { id: 'l3', timestamp: '16:01:12', type: 'success', text: 'Baileys Socket conectado com sucesso na interface do WhatsApp Web!' },
  { id: 'l4', timestamp: '16:02:15', type: 'info', text: 'Anti-Link está habilitado globalmente para proteção de canais.' },
  { id: 'l5', timestamp: '16:03:00', type: 'success', text: 'Coruja Store Bot ativo e monitorando grupos em tempo real.' }
];

export const INITIAL_STATS: BotStats = {
  messagesSent: 2841,
  activeChats: 14,
  avgResponseTime: 0.4, // seconds
  conversionRate: 100 // Deliverability
};
