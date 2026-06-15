import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sliders, Shield, Key, Check, AlertTriangle, Sparkles, HelpCircle, Eye, EyeOff, Hash, Info, ToggleLeft, ToggleRight } from 'lucide-react';

interface GroupConfigData {
  jid: string;
  antiLink: boolean;
  autoSticker: boolean;
  welcome: boolean;
  exit: boolean;
  autoResponder: boolean;
  onlyAdmins: boolean;
  prefix: string;
  groupActive: boolean;
}

interface GroupConfiguratorProps {
  onBotAction: (logText: string, logType: 'info' | 'success' | 'warning' | 'error') => void;
}

export const GroupConfigurator: React.FC<GroupConfiguratorProps> = ({ onBotAction }) => {
  const [selectedJid, setSelectedJid] = useState<string>('default');
  const [customJid, setCustomJid] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  
  const [groups, setGroups] = useState<Array<{ label: string; jid: string }>>([
    { label: '🪐 Geral (Todos os Grupos)', jid: 'default' },
    { label: '💎 Grupo VIP', jid: '120363290001@g.us' },
    { label: '📣 Canal de Anúncios', jid: '120363290002@g.us' },
    { label: '💬 Chat de Vendas & Suporte', jid: '120363290003@g.us' }
  ]);

  // Token state
  const [spiderToken, setSpiderToken] = useState<string>('');
  const [showToken, setShowToken] = useState<boolean>(false);
  const [savingToken, setSavingToken] = useState<boolean>(false);

  // Fetch groups dynamically
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch('/api/groups');
        if (res.ok) {
          const list = await res.json();
          const mapped = list.map((g: any) => ({
            jid: g.jid,
            label: g.name || g.label
          }));
          setGroups(mapped);
        }
      } catch (err) {
        console.error('Falha ao obter lista de grupos no servidor:', err);
      }
    };
    fetchGroups();
  }, []);

  // Group settings state
  const [config, setConfig] = useState<GroupConfigData>({
    jid: 'default',
    antiLink: false,
    autoSticker: false,
    welcome: false,
    exit: false,
    autoResponder: true,
    onlyAdmins: false,
    prefix: '/',
    groupActive: true
  });

  // Fetch Spider Token on mount
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await fetch('/api/settings/token');
        if (res.ok) {
          const data = await res.json();
          setSpiderToken(data.token || '');
        }
      } catch (err) {
        console.error('Erro ao ler token da Spider API:', err);
      }
    };
    fetchToken();
  }, []);

  // Fetch specific group config when selected JID changes
  useEffect(() => {
    const fetchGroupConfig = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/settings/group?jid=${selectedJid}`);
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        }
      } catch (err) {
        console.error('Erro ao carregar configurações de grupo:', err);
        onBotAction('Erro de rede ao buscar configurações de grupo.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupConfig();
  }, [selectedJid]);

  // Handle setting toggle changes
  const handleToggle = async (property: keyof GroupConfigData, currentValue: boolean) => {
    const nextValue = !currentValue;
    
    // Optimistic UI state update
    setConfig(prev => ({
      ...prev,
      [property]: nextValue
    }));

    try {
      const res = await fetch('/api/settings/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jid: selectedJid,
          property,
          active: nextValue
        })
      });

      if (res.ok) {
        const readableLabel = {
          antiLink: 'Anti-Link',
          autoSticker: 'Auto-Figurinha',
          welcome: 'Boas-vindas',
          exit: 'Aviso de Saída',
          autoResponder: 'Auto-Responder',
          onlyAdmins: 'Modo Apenas Admins',
          groupActive: 'Status do Grupo'
        }[property as string] || property;

        onBotAction(`Configuração "${readableLabel}" de grupo salva: ${nextValue ? 'HABILITADA' : 'DESABILITADA'}.`, 'success');
      } else {
        // Rollback on error
        setConfig(prev => ({
          ...prev,
          [property]: currentValue
        }));
        onBotAction('Falha ao salvar configuração no banco do bot.', 'error');
      }
    } catch (err) {
      // Rollback on network error
      setConfig(prev => ({
        ...prev,
        [property]: currentValue
      }));
      console.error('Erro de requisição ao salvar configuração:', err);
      onBotAction('Erro de conexão ao salvar status do grupo.', 'error');
    }
  };

  // Handle custom Prefix save
  const handleSavePrefix = async (prefixValue: string) => {
    try {
      const res = await fetch('/api/settings/prefix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid: selectedJid, prefix: prefixValue })
      });
      if (res.ok) {
        setConfig(prev => ({ ...prev, prefix: prefixValue }));
        onBotAction(`Prefixo de comando para grupo redefinido para "${prefixValue}" com sucesso.`, 'success');
      } else {
        onBotAction('Erro ao gravar prefixo no servidor.', 'error');
      }
    } catch (err) {
      console.error('Erro ao salvar prefixo:', err);
      onBotAction('Erro de requisição ao mudar prefixo.', 'error');
    }
  };

  // Handle API Token save
  const handleSaveToken = async () => {
    setSavingToken(true);
    try {
      const res = await fetch('/api/settings/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: spiderToken })
      });
      if (res.ok) {
        onBotAction('Token da API Spider X atualizado e persistido com sucesso.', 'success');
      } else {
        onBotAction('Fracasso ao autenticar alteração de token.', 'error');
      }
    } catch (err) {
      console.error('Erro ao persistir token:', err);
      onBotAction('Conexão recusada ao salvar token.', 'error');
    } finally {
      setSavingToken(false);
    }
  };

  const handleAddCustomJid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customJid.trim()) return;
    
    let formattedJid = customJid.trim();
    if (!formattedJid.includes('@g.us')) {
      formattedJid = `${formattedJid.replace(/\D/g, '')}@g.us`;
    }

    setSelectedJid(formattedJid);
    setCustomJid('');
    setShowCustomInput(false);
    onBotAction(`Adicionado grupo customizado por ID: "${formattedJid}" no editor.`, 'info');
  };

  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800/80 p-5 shadow-xl h-full flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Shield size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-white">Configurações de Grupo & APIs</h3>
              <p className="text-xs text-zinc-400">Ative filtros de moderação, anti-link e configure chaves reais do bot</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-mono leading-none bg-black px-2 py-1 rounded">
            <Sparkles size={11} className="text-amber-400" />
            <span>MODO DEV ATIVO</span>
          </div>
        </div>

        {/* Global Tokens & Integration Section */}
        <div className="bg-black/40 border border-zinc-800/50 rounded-xl p-3.5 mb-5 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold font-display text-amber-400">
            <Key size={13} />
            <span>CREDENCIAIS DE INTEGRAÇÃO (SPIDER X API)</span>
          </div>
          <p className="text-[10px] text-zinc-400 leading-relaxed">
            A Spider X API é utilizada pelos comandos do bot que necessitam de recursos premium (downloads de mídia alta velocidade, etc.). Obtenha seu token em <a href="https://api.spiderx.com.br" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">api.spiderx.com.br</a>.
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showToken ? 'text' : 'password'}
                value={spiderToken}
                onChange={(e) => setSpiderToken(e.target.value)}
                placeholder="Insira seu Token Spider API..."
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-zinc-200 text-xs rounded-lg pl-3 pr-9 py-2 focus:outline-hidden transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-2 text-zinc-500 hover:text-zinc-300 transition"
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <button
              onClick={handleSaveToken}
              disabled={savingToken}
              className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-zinc-950 text-xs font-semibold transition active:scale-95 whitespace-nowrap"
            >
              {savingToken ? 'Espere...' : 'Salvar Token'}
            </button>
          </div>
        </div>

        {/* Group Selection Block */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold font-display text-zinc-300">GRUPO EM EDIÇÃO</label>
            <button
              onClick={() => setShowCustomInput(!showCustomInput)}
              className="text-[10px] text-amber-400 hover:underline transition"
            >
              {showCustomInput ? 'Voltar para Lista' : '+ Inserir JID Customizado'}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {showCustomInput ? (
              <motion.form
                key="custom-form"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                onSubmit={handleAddCustomJid}
                className="flex gap-2"
              >
                <input
                  type="text"
                  required
                  value={customJid}
                  onChange={(e) => setCustomJid(e.target.value)}
                  placeholder="Ex: 5511999999999@g.us ou ID do Grupo"
                  className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-hidden transition font-mono"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition"
                >
                  Adicionar
                </button>
              </motion.form>
            ) : (
              <select
                value={selectedJid}
                onChange={(e) => setSelectedJid(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-hidden cursor-pointer"
              >
                {groups.map((g) => (
                  <option key={g.jid} value={g.jid}>
                    {g.label} {g.jid !== 'default' ? `(${g.jid.substring(0, 15)}...)` : ''}
                  </option>
                ))}
                {!groups.some(g => g.jid === selectedJid) && (
                  <option value={selectedJid}>
                    Custom: {selectedJid}
                  </option>
                )}
              </select>
            )}
          </AnimatePresence>
        </div>

        {/* Loading Overlay */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2">
            <span className="w-6 h-6 rounded-full border-2 border-amber-500 border-t-transparent animate-spin inline-block" />
            <span className="text-zinc-500 text-[11px] font-mono">Sincronizando do banco real...</span>
          </div>
        ) : (
          /* Settings switches */
          <div className="space-y-2.5 mt-4">
            {/* Active Group Block */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-900 hover:border-zinc-800 transition">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-zinc-200 uppercase">Bot Escutando Grupo</span>
                  {config.groupActive ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 leading-none">Se desativado, o bot ignora todas mensagens deste chat</p>
              </div>

              <button
                onClick={() => handleToggle('groupActive', config.groupActive)}
                className={`text-zinc-400 hover:text-white transition ${config.groupActive ? 'text-emerald-400' : 'text-zinc-600'}`}
              >
                {config.groupActive ? <ToggleRight size={38} className="text-emerald-500" /> : <ToggleLeft size={38} className="text-zinc-500" />}
              </button>
            </div>

            {/* Anti-Link */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-zinc-900/60 hover:border-zinc-800 transition">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-zinc-200 uppercase">Sistema Anti-Link</span>
                <p className="text-[10px] text-zinc-500 leading-none">Exclui avisando links compartilhados por não-administradores</p>
              </div>

              <button
                onClick={() => handleToggle('antiLink', config.antiLink)}
                className={`text-zinc-400 hover:text-white transition`}
              >
                {config.antiLink ? <ToggleRight size={38} className="text-emerald-500" /> : <ToggleLeft size={38} className="text-zinc-500" />}
              </button>
            </div>

            {/* Auto-Sticker */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-zinc-900/60 hover:border-zinc-800 transition">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-zinc-200 uppercase">Auto-Figurinha (Sticker)</span>
                <p className="text-[10px] text-zinc-500 leading-none">Imagens e vídeos enviados tornam-se stickers instantaneamente</p>
              </div>

              <button
                onClick={() => handleToggle('autoSticker', config.autoSticker)}
                className={`text-zinc-400 hover:text-white transition`}
              >
                {config.autoSticker ? <ToggleRight size={38} className="text-emerald-500" /> : <ToggleLeft size={38} className="text-zinc-500" />}
              </button>
            </div>

            {/* Welcome & Exit */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-zinc-900/60 hover:border-zinc-800 transition">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-200 uppercase">Boas-Vindas</span>
                  <p className="text-[9px] text-zinc-500 leading-none">Avisos de entrada</p>
                </div>
                <button onClick={() => handleToggle('welcome', config.welcome)}>
                  {config.welcome ? <ToggleRight size={34} className="text-emerald-500 shrink-0" /> : <ToggleLeft size={34} className="text-zinc-500 shrink-0" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-zinc-900/60 hover:border-zinc-800 transition">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-200 uppercase">Aviso Saída</span>
                  <p className="text-[9px] text-zinc-500 leading-none">Avisos de saída</p>
                </div>
                <button onClick={() => handleToggle('exit', config.exit)}>
                  {config.exit ? <ToggleRight size={34} className="text-emerald-500 shrink-0" /> : <ToggleLeft size={34} className="text-zinc-500 shrink-0" />}
                </button>
              </div>
            </div>

            {/* Auto Responder trigger and Only Admins */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-zinc-900/60 hover:border-zinc-800 transition">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-200 uppercase">Pios Gatilho</span>
                  <p className="text-[9px] text-zinc-500 leading-none">Auto responder ativo</p>
                </div>
                <button onClick={() => handleToggle('autoResponder', config.autoResponder)}>
                  {config.autoResponder ? <ToggleRight size={34} className="text-emerald-500" /> : <ToggleLeft size={34} className="text-zinc-500" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-zinc-900/60 hover:border-zinc-800 transition">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-200 uppercase">Só Admins</span>
                  <p className="text-[9px] text-zinc-500 leading-none">Apenas comandos de admins</p>
                </div>
                <button onClick={() => handleToggle('onlyAdmins', config.onlyAdmins)}>
                  {config.onlyAdmins ? <ToggleRight size={34} className="text-emerald-500" /> : <ToggleLeft size={34} className="text-zinc-500" />}
                </button>
              </div>
            </div>

            {/* Custom group prefix override */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-zinc-900/60 hover:border-zinc-800 transition">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-zinc-200 uppercase">Prefixo Customizado do Grupo</span>
                <p className="text-[10px] text-zinc-500 leading-none">Caractere de ação (ex: !, /, .)</p>
              </div>

              <div className="flex gap-1">
                {['/', '!', '.'].map((char) => (
                  <button
                    key={char}
                    onClick={() => handleSavePrefix(char)}
                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition font-mono ${
                      config.prefix === char
                        ? 'bg-amber-500 text-zinc-950 border border-amber-400'
                        : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400'
                    }`}
                  >
                    {char}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tip footer */}
      <div className="text-[10px] text-zinc-500 mt-4 leading-relaxed border-t border-zinc-850 pt-3 flex gap-1 items-start">
        <span className="text-amber-500">⚠</span>
        <span>Ajustes efetuados são gravados instantaneamente nos arquivos JSON do Bot (pasta <code>database/</code>). Sincronização em tempo real de hardware!</span>
      </div>
    </div>
  );
};
