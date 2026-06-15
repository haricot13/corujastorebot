import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  FileCode2, 
  ShoppingCart, 
  FileJson,
  Image, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  FolderOpen,
  Terminal,
  FileSignature,
  Sliders,
  Play,
  Trash2,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Sparkles
} from 'lucide-react';

interface BotSetupManagerProps {
  onBotAction: (logText: string, logType: 'info' | 'success' | 'warning' | 'error') => void;
}

interface CommandDesc {
  fileName: string;
  relPath: string;
  name: string;
  category: string;
  commands: string[];
  description: string;
}

interface Product {
  id: string;
  name: string;
  price: string;
  imageUrl: string;
  link: string;
}

interface ConfigData {
  prefix: string;
  bot_name: string;
  bot_emoji: string;
  openai_api_key: string;
  spider_api_token: string;
  linker_api_key: string;
  only_group_id: string;
  developer_mode: boolean;
  shop_name: string;
  shop_webhook: string;
  shop_api_key: string;
  order_notification_msg: string;
  welcome_image_url: string;
  webhook_receiver_id?: string; // fallback
  webhook_receiver_jid: string;
  webhook_enabled: boolean;
  recursive_ads_enabled: boolean;
  recursive_ads_interval_minutes: number;
  recursive_ads_receiver_jid: string;
  shop_products: Product[];
}

export const BotSetupManager: React.FC<BotSetupManagerProps> = ({ onBotAction }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'commands' | 'shop'>('config');

  // Configuration form state
  const [config, setConfig] = useState<ConfigData>({
    prefix: '/',
    bot_name: 'Coruja Store Bot',
    bot_emoji: '🪐',
    openai_api_key: '',
    spider_api_token: '',
    linker_api_key: '',
    only_group_id: '',
    developer_mode: false,
    shop_name: 'Admin Store',
    shop_webhook: '',
    shop_api_key: '',
    order_notification_msg: 'Olá! Desejamos avisar que seu pedido #{ORDER_ID} foi postado ou atualizado com sucesso! 🪐📦',
    welcome_image_url: '/takeshi-bot.png',
    webhook_receiver_jid: 'default',
    webhook_enabled: true,
    recursive_ads_enabled: false,
    recursive_ads_interval_minutes: 15,
    recursive_ads_receiver_jid: 'default',
    shop_products: []
  });

  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Commands state
  const [commandsList, setCommandsList] = useState<CommandDesc[]>([]);
  const [loadingCommands, setLoadingCommands] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<CommandDesc | null>(null);
  const [commandCode, setCommandCode] = useState<string>('');
  const [loadingCode, setLoadingCode] = useState(false);
  const [savingCode, setSavingCode] = useState(false);

  // Local state for product editing
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [forcingPolling, setForcingPolling] = useState(false);
  const [pollingDiag, setPollingDiag] = useState<any | null>(null);
  const [triggeringAd, setTriggeringAd] = useState(false);
  const [newProd, setNewProd] = useState({
    name: '',
    price: '',
    imageUrl: '',
    link: ''
  });

  // State for loaded WhatsApp groups from Bot
  const [groupsList, setGroupsList] = useState<{ jid: string; name: string }[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Fetch bot general configurations
  const fetchConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch('/api/bot-config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Falha ao buscar configurações do bot:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  // Fetch WhatsApp groups connected to bot
  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroupsList(data);
      }
    } catch (err) {
      console.error('Falha ao carregar grupos do WhatsApp:', err);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Fetch commands list
  const fetchCommands = async () => {
    setLoadingCommands(true);
    try {
      const res = await fetch('/api/commands');
      if (res.ok) {
        const data = await res.json();
        if (data.commands) {
          setCommandsList(data.commands);
          if (data.commands.length > 0 && !selectedCommand) {
            handleSelectCommand(data.commands[0]);
          }
        }
      }
    } catch (err) {
      console.error('Falha ao carregar comandos do bot:', err);
    } finally {
      setLoadingCommands(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchCommands();
    fetchGroups();
  }, []);

  const handleSelectCommand = async (cmd: CommandDesc) => {
    setSelectedCommand(cmd);
    setLoadingCode(true);
    try {
      const res = await fetch(`/api/commands/content?path=${encodeURIComponent(cmd.relPath)}`);
      if (res.ok) {
        const data = await res.json();
        setCommandCode(data.content || '');
      }
    } catch (err) {
      console.error('Erro ao buscar o código do comando:', err);
      onBotAction(`Falha ao ler arquivo de comando ${cmd.fileName}`, 'error');
    } finally {
      setLoadingCode(false);
    }
  };

  const handleSaveConfig = async (e?: React.FormEvent, customConfigData?: Partial<ConfigData>) => {
    if (e) e.preventDefault();
    setSavingConfig(true);
    
    const configurationToSave = customConfigData ? { ...config, ...customConfigData } : config;

    try {
      const res = await fetch('/api/bot-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configurationToSave)
      });
      if (res.ok) {
        onBotAction('Configurações e estratégias de anti-ban salvas com sucesso!', 'success');
        // Update local state is crucial
        if (customConfigData) {
          setConfig(prev => ({ ...prev, ...customConfigData }));
        }
      } else {
        onBotAction('Falha ao salvar as configurações no servidor.', 'error');
      }
    } catch (err) {
      console.error('Erro de requisição:', err);
      onBotAction('Erro de rede ao salvar configurações.', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveCommandCode = async () => {
    if (!selectedCommand) return;
    setSavingCode(true);
    try {
      const res = await fetch('/api/commands/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: selectedCommand.relPath,
          content: commandCode
        })
      });
      if (res.ok) {
        onBotAction(`Código do comando "${selectedCommand.fileName}" salvo e compilado!`, 'success');
      } else {
        onBotAction('Erro ao salvar arquivos de comando.', 'error');
      }
    } catch (err) {
      console.error('Falha ao atualizar código:', err);
      onBotAction('Erro de conectividade com o editor do servidor.', 'error');
    } finally {
      setSavingCode(false);
    }
  };

  // Store Direct API and Ad automation interactions
  const handleCopyApiToken = () => {
    navigator.clipboard.writeText("corujabot_1lv0KF2mAxgqgkHPrMbVeuW5zag4");
    setCopiedWebhook(true);
    onBotAction('Chave Token da API copiada para a área de transferência!', 'success');
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleTestApiPooling = async () => {
    setTestingWebhook(true);
    onBotAction('Iniciando simulação de nova venda no banco de dados da loja...', 'info');
    try {
      // Pick random item from catalog
      const randomProduct = config.shop_products.length > 0
        ? config.shop_products[Math.floor(Math.random() * config.shop_products.length)]
        : { name: 'Mamba Bot Ultra Script', price: '149.90' };

      // Simulates in the direct polling mock store db!
      const res = await fetch('/api/shop/simulate-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ryanvaz07@gmail.com',
          product_name: randomProduct.name,
          amount: randomProduct.price
        })
      });
      
      if (res.ok) {
        onBotAction('Venda simulada! O robô irá detectá-la via API em até 10 segundos e enviar no WhatsApp.', 'success');
      } else {
        onBotAction('Falha ao simular venda na API.', 'error');
      }
    } catch (err) {
      console.error(err);
      onBotAction('Erro de conexão ao simular venda na API.', 'error');
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleForcePollingReal = async () => {
    setForcingPolling(true);
    setPollingDiag(null);
    onBotAction('Disparando consulta imediata na API de compras da sua loja...', 'info');
    try {
      const res = await fetch('/api/bot/force-sales-polling', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      setPollingDiag(data);
      if (data.success) {
        if (data.notifiedThisTurnCount > 0) {
          onBotAction(`Sucesso! Foram sincronizadas ${data.foundCount} compras da API. ${data.notifiedThisTurnCount} novas comemorações enviadas no WhatsApp!`, 'success');
        } else {
          onBotAction(`Sincronização concluída com sucesso. Foram lidas ${data.foundCount} compras recentes, nenhuma pendente de envio.`, 'success');
        }
      } else {
        const errMsg = data.error || data.message || 'Verifique as configurações do endpoint.';
        onBotAction(`Atenção: A consulta ao endpoint falhou ou retornou dados incompatíveis: ${errMsg}`, 'error');
      }
    } catch (err: any) {
      console.error(err);
      onBotAction(`Erro de rede ao forçar sincronização: ${err.message}`, 'error');
    } finally {
      setForcingPolling(false);
    }
  };

  const handleTriggerAdBroadcast = async () => {
    setTriggeringAd(true);
    onBotAction('Forçando disparo de anúncio de produto aleatório no WhatsApp...', 'info');
    try {
      const res = await fetch('/api/shop/broadcast-random', { method: 'POST' });
      if (res.ok) {
        onBotAction('Anúncio enviado com sucesso seguindo rodízio anti-ban!', 'success');
      } else {
        const data = await res.json();
        onBotAction(`Falha ao disparar anúncio: ${data.error || 'Verifique se o bot está pareado.'}`, 'warning');
      }
    } catch (err) {
      console.error(err);
      onBotAction('Erro técnico ao solicitar broadcast.', 'error');
    } finally {
      setTriggeringAd(false);
    }
  };

  const handleAddProduct = () => {
    if (!newProd.name || !newProd.price) {
      onBotAction('Nome e Preço são obrigatórios para registrar o produto.', 'warning');
      return;
    }
    const updatedProducts = [
      ...config.shop_products,
      {
        id: `prod-${Date.now()}`,
        name: newProd.name,
        price: newProd.price,
        imageUrl: newProd.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500',
        link: newProd.link || 'https://takeshibot.com'
      }
    ];

    handleSaveConfig(undefined, { shop_products: updatedProducts });
    setNewProd({ name: '', price: '', imageUrl: '', link: '' });
  };

  const handleDeleteProduct = (productId: string) => {
    const updatedProducts = config.shop_products.filter(p => p.id !== productId);
    handleSaveConfig(undefined, { shop_products: updatedProducts });
  };

  return (
    <div id="bot-setup-manager-container" className="rounded-2xl bg-slate-900 border border-slate-850 shadow-xl overflow-hidden flex flex-col min-h-[480px]">
      
      {/* Tab Select Header */}
      <div className="flex bg-slate-950 border-b border-slate-850 p-4 justify-between items-center flex-wrap gap-4 select-none">
        <div className="flex gap-2">
          <button
            id="tab-btn-config"
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition duration-200 outline-none leading-none cursor-pointer ${
              activeTab === 'config'
                ? 'bg-amber-500 text-slate-950 shadow shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80'
            }`}
          >
            <Settings size={14} />
            <span>Ajustes do Bot</span>
          </button>

          <button
            id="tab-btn-commands"
            onClick={() => setActiveTab('commands')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition duration-200 outline-none leading-none cursor-pointer ${
              activeTab === 'commands'
                ? 'bg-amber-500 text-slate-950 shadow shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80'
            }`}
          >
            <FileCode2 size={14} />
            <span>Editor de Comandos</span>
          </button>

          <button
            id="tab-btn-shop"
            onClick={() => setActiveTab('shop')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition duration-200 outline-none leading-none cursor-pointer ${
              activeTab === 'shop'
                ? 'bg-amber-500 text-slate-950 shadow shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80'
            }`}
          >
            <ShoppingCart size={14} />
            <span>Ofertas Recorrentes</span>
          </button>
        </div>

        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 uppercase tracking-widest leading-none">
          <Terminal size={12} className="text-amber-500 animate-pulse" />
          <span>Configuração Direta</span>
        </div>
      </div>

      {/* Tabs panels */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        
        <AnimatePresence mode="wait">
          {activeTab === 'config' && (
            <motion.form
              key="panel-config"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSaveConfig}
              className="space-y-4 flex-1 flex flex-col justify-between"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Bot Name field */}
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400 font-mono uppercase">
                     Nome do Bot
                  </label>
                  <input
                    type="text"
                    required
                    value={config.bot_name}
                    onChange={(e) => setConfig({ ...config, bot_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-slate-200 text-xs rounded-xl px-4 py-2.5 focus:outline-hidden transition"
                  />
                </div>

                {/* Bot Prefix & Emoji field */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-400 font-mono uppercase">
                       Prefixo Padrão
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={3}
                      value={config.prefix}
                      onChange={(e) => setConfig({ ...config, prefix: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-slate-200 text-xs rounded-xl px-4 py-2.5 focus:outline-hidden transition text-center font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-400 font-mono uppercase">
                       Emoji do Bot
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={config.bot_emoji}
                      onChange={(e) => setConfig({ ...config, bot_emoji: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-slate-200 text-xs rounded-xl px-4 py-2.5 focus:outline-hidden transition text-center"
                    />
                  </div>
                </div>

                {/* ChatGPT API Key field */}
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400 font-mono uppercase">
                     Chave OpenAI (ChatGPT)
                  </label>
                  <input
                    type="text"
                    placeholder="Abra seu GPT: sk-proj-..."
                    value={config.openai_api_key}
                    onChange={(e) => setConfig({ ...config, openai_api_key: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-slate-200 text-xs rounded-xl px-4 py-2.5 focus:outline-hidden transition font-mono focus:ring-0"
                  />
                </div>

                {/* Welcome Image URL config */}
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400 font-mono uppercase">
                      URL da Imagem de Boas-vindas
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Caminho local ou Link https://"
                      value={config.welcome_image_url}
                      onChange={(e) => setConfig({ ...config, welcome_image_url: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-slate-200 text-xs rounded-xl pl-4 pr-10 py-2.5 focus:outline-hidden transition font-mono focus:ring-0"
                    />
                    <div className="absolute right-3.5 top-3 text-slate-500">
                      <Image size={14} />
                    </div>
                  </div>
                </div>

                {/* Only Group ID restrictor */}
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400 font-mono uppercase">
                      ID Único de Grupo (Restrição)
                  </label>
                  <input
                    type="text"
                    placeholder="Mantenha em branco para responder em qualquer canal"
                    value={config.only_group_id}
                    onChange={(e) => setConfig({ ...config, only_group_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-slate-200 text-xs rounded-xl px-4 py-2.5 focus:outline-hidden transition font-mono"
                  />
                </div>

                {/* Dev mode switch inside panels */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-850">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-200 uppercase">Modo Desenvolvedor</span>
                    <p className="text-[9px] text-slate-500">Exibe pacotes crus em tempo de execução de terminal</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.developer_mode}
                    onChange={(e) => setConfig({ ...config, developer_mode: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-800 transition focus:ring-0 cursor-pointer"
                  />
                </div>

              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-slate-850 pt-5">
                <span className="text-[10px] text-slate-400 leading-normal font-mono flex items-start gap-1">
                  <span className="text-amber-500">⚠️</span>
                  <span>Altere parâmetros e clique em salvar. Caso queira reiniciar o bot para aplicar, use o botão de pausa no topo.</span>
                </span>
                
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-amber-500/10 cursor-pointer shrink-0 w-full sm:w-auto font-sans"
                >
                  {savingConfig ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  <span>Salvar Parâmetros</span>
                </button>
              </div>

            </motion.form>
          )}

          {activeTab === 'commands' && (
            <motion.div
              key="panel-commands"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col space-y-4"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                
                {/* Commands Navigation Column */}
                <div className="lg:col-span-4 border border-slate-850 rounded-xl overflow-hidden bg-slate-950/60 max-h-[380px] flex flex-col">
                  <div className="p-3 border-b border-slate-850 bg-slate-950/80 text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                    <FolderOpen size={13} />
                    <span>Estrutura de Comandos</span>
                  </div>
                  
                  {loadingCommands ? (
                    <div className="p-6 flex-1 flex flex-col items-center justify-center space-y-2">
                      <RefreshCw size={16} className="animate-spin text-amber-500" />
                      <span className="text-[10px] font-mono text-slate-400 uppercase">Buscando códigos...</span>
                    </div>
                  ) : (
                    <div className="p-2 overflow-y-auto flex-1 space-y-3">
                      {['member', 'admin', 'owner'].map(category => {
                        const recs = commandsList.filter(c => c.category === category);
                        if (recs.length === 0) return null;
                        
                        return (
                          <div key={category} className="space-y-1">
                            <span className="block text-[8px] font-bold font-mono text-slate-500 uppercase tracking-widest pl-2">
                              {category === 'member' ? 'Membros / Público' : category === 'admin' ? 'Administração' : 'Dono do Bot (Owner)'}
                            </span>
                            {recs.map(cmd => (
                              <button
                                key={cmd.relPath}
                                onClick={() => handleSelectCommand(cmd)}
                                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition flex flex-col leading-tight cursor-pointer ${
                                  selectedCommand?.relPath === cmd.relPath
                                    ? 'bg-amber-500/10 border-l-2 border-amber-500 text-amber-400 font-bold'
                                    : 'text-slate-300 hover:bg-slate-900/60 hover:text-white'
                                }`}
                              >
                                <span className="truncate">{cmd.name}</span>
                                <span className="text-[9px] text-slate-500 font-mono font-normal truncate mt-0.5">
                                  {cmd.commands.map(b => `/${b}`).join(', ')}
                                </span>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Core Code Visualizer Editor Area */}
                <div className="lg:col-span-8 flex flex-col border border-slate-850 rounded-xl overflow-hidden bg-slate-950 flex-1 min-h-[380px]">
                  
                  {selectedCommand ? (
                    <div className="flex-1 flex flex-col justify-between">
                      
                      {/* Editor top path descriptor */}
                      <div className="p-3 bg-slate-900 border-b border-slate-850 flex items-center justify-between shadow-inner">
                        <div className="flex items-center gap-2">
                          <FileSignature size={12} className="text-amber-500" />
                          <span className="font-mono text-xs text-white max-w-sm truncate">{selectedCommand.relPath}</span>
                        </div>
                        <span className="text-[9px] font-mono leading-none bg-slate-850 border border-slate-800 px-2 py-1 rounded text-slate-400 capitalize">
                          {selectedCommand.category}
                        </span>
                      </div>

                      {/* Code Input */}
                      <div className="flex-1 relative p-1">
                        {loadingCode ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 space-y-2">
                            <RefreshCw size={16} className="animate-spin text-amber-500" />
                            <span className="text-[10px] font-mono text-slate-400 uppercase">Lendo Código-Fonte...</span>
                          </div>
                        ) : (
                          <textarea
                            value={commandCode}
                            onChange={(e) => setCommandCode(e.target.value)}
                            spellCheck={false}
                            className="w-full h-[270px] bg-slate-950 text-slate-350 font-mono text-xs p-4 focus:outline-hidden resize-none leading-relaxed transition shadow-inner font-light border-0"
                          />
                        )}
                      </div>

                      {/* Descriptor metadata display */}
                      <div className="p-3 border-t border-slate-850 bg-slate-900/40 text-[10px] text-slate-400 leading-snug">
                        <strong>Descrição do Comando:</strong> {selectedCommand.description}
                      </div>

                      {/* Save panel footer area */}
                      <div className="p-3.5 bg-slate-900 border-t border-slate-850 flex items-center justify-between flex-wrap gap-4 select-none">
                        <span className="text-[9px] text-slate-500 font-mono font-medium">Syntax: ES Modules Standard Javascript</span>
                        <button
                          type="button"
                          onClick={handleSaveCommandCode}
                          disabled={savingCode || loadingCode}
                          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow cursor-pointer shrink-0"
                        >
                          {savingCode ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <Save size={12} />
                          )}
                          <span>Salvar Arquivo</span>
                        </button>
                      </div>

                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-2 text-slate-400">
                      <FileCode2 size={40} className="text-slate-600 animate-bounce" />
                      <p className="text-sm font-semibold text-white">Nenhum comando selecionado</p>
                      <p className="text-xs text-slate-500 max-w-xs leading-relaxed">Selecione uma regra ou script à esquerda para ler e editar o código nativo.</p>
                    </div>
                  )}

                </div>

              </div>
            </motion.div>
          )}

          {activeTab === 'shop' && (
            <motion.div
              key="panel-shop"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 flex-1 flex flex-col"
            >
              
              {/* Top info and instruction box */}
              <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 flex gap-4 leading-relaxed items-start">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                  <ShoppingCart size={18} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-sans font-medium">Gerenciador de Ofertas Recorrentes - Coruja Store</h4>
                  <p className="text-[10px] text-slate-400 font-light leading-normal">
                     Configure o sistema de publicidade e anúncios automáticos periódicos. O robô enviará ofertas selecionadas do catálogo diretamente nos canais e grupos configurados para máxima atratividade e conversão sem repetição de anúncios.
                  </p>
                </div>
              </div>

              {/* Grid 1: Recurrent Ads Settings (Full Width, No API Section) */}
              <div className="grid grid-cols-1 gap-5">

                {/* Section B: Recurrent ads campaign builder */}
                <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-850/60">
                    <div className="flex items-center gap-1.5">
                      <RefreshCw size={14} className="text-amber-500" />
                      <span className="text-xs font-bold text-white uppercase tracking-widest font-mono">Ofertas Recorrentes (Sem Repetição)</span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleSaveConfig(undefined, { recursive_ads_enabled: !config.recursive_ads_enabled })}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold font-mono transition capitalize cursor-pointer ${
                        config.recursive_ads_enabled 
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                          : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                      }`}
                    >
                      {config.recursive_ads_enabled ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Interval slider minutes */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[9px] text-slate-400 font-mono uppercase">Frequência (Minutos)</label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={config.recursive_ads_interval_minutes}
                          onChange={(e) => setConfig({ ...config, recursive_ads_interval_minutes: Math.max(1, parseInt(e.target.value) || 15) })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-hidden transition text-center font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="block text-[9px] text-slate-400 font-mono uppercase">Grupo Alvo Ofertas</label>
                          <button
                            type="button"
                            onClick={fetchGroups}
                            disabled={loadingGroups}
                            className="text-[9px] text-amber-500 hover:text-amber-400 flex items-center gap-1 font-mono transition"
                          >
                            <RefreshCw size={8} className={loadingGroups ? 'animate-spin' : ''} />
                          </button>
                        </div>
                        <select
                          value={config.recursive_ads_receiver_jid || 'default'}
                          onChange={(e) => setConfig({ ...config, recursive_ads_receiver_jid: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-hidden transition font-sans cursor-pointer"
                        >
                          {groupsList.length === 0 ? (
                            <option value="default">Geral (Todos os Grupos)</option>
                          ) : (
                            groupsList.map((g) => (
                              <option key={g.jid} value={g.jid}>
                                {g.name}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleTriggerAdBroadcast}
                        disabled={triggeringAd}
                        className="flex-1 py-2 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer font-sans"
                      >
                        {triggeringAd ? (
                          <RefreshCw size={13} className="animate-spin text-slate-400" />
                        ) : (
                          <Play size={13} className="text-amber-500" />
                        )}
                        <span>Disparar Anúncio Agora</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveConfig(undefined, { 
                          recursive_ads_interval_minutes: config.recursive_ads_interval_minutes,
                          recursive_ads_receiver_jid: config.recursive_ads_receiver_jid
                        })}
                        className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 text-xs text-slate-200 flex items-center justify-center transition cursor-pointer"
                        title="Salvar Ajustes de Campanhas"
                      >
                        <Save size={14} />
                      </button>
                    </div>

                  </div>

                </div>

              </div>

              {/* Grid 2: Product Catalogue Creator */}
              <div className="bg-slate-950/30 border border-slate-850 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-850/60">
                  <div className="flex items-center gap-1.5">
                    <Sliders size={14} className="text-amber-500" />
                    <span className="text-xs font-bold text-white uppercase tracking-widest font-mono">Catálogo de Produtos do Carrossel</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {config.shop_products.length} {config.shop_products.length === 1 ? 'Produto cadastrado' : 'Produtos cadastrados'}
                  </span>
                </div>

                {/* Inline new product creator form */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-850/60">
                  <div className="space-y-1">
                    <span className="block text-[9px] text-slate-400 font-mono uppercase">Título do Produto</span>
                    <input
                      type="text"
                      placeholder="Ex: Licença Script"
                      value={newProd.name}
                      onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="block text-[9px] text-slate-400 font-mono uppercase">Preço (R$)</span>
                    <input
                      type="text"
                      placeholder="Ex: 149.90"
                      value={newProd.price}
                      onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg outline-hidden font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="block text-[9px] text-slate-400 font-mono uppercase">URL Imagem</span>
                    <input
                      type="text"
                      placeholder="Https:// link ou deixe em branco"
                      value={newProd.imageUrl}
                      onChange={(e) => setNewProd({ ...newProd, imageUrl: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg outline-hidden"
                    />
                  </div>

                  <div className="space-y-1 flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <span className="block text-[9px] text-slate-400 font-mono uppercase">Link de Compra</span>
                      <input
                        type="text"
                        placeholder="https://meusite.com/checkout"
                        value={newProd.link}
                        onChange={(e) => setNewProd({ ...newProd, link: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg outline-hidden"
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleAddProduct}
                      className="h-9 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0 transition active:scale-95 cursor-pointer font-sans"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Displaying product items list */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-1 max-h-[300px] overflow-y-auto pr-1">
                  {config.shop_products.length === 0 ? (
                    <div className="md:col-span-3 text-center p-8 border border-dashed border-slate-800/80 rounded-xl text-slate-500 text-xs">
                       Nenhum produto cadastrado no catálogo. Adicione um produto acima para iniciar campanhas.
                    </div>
                  ) : (
                    config.shop_products.map((prod) => (
                      <div key={prod.id} className="bg-slate-950/40 border border-slate-850/80 rounded-xl p-3 flex gap-3 items-center justify-between hover:border-slate-800 transition">
                        {prod.imageUrl && (prod.imageUrl.startsWith('http') || prod.imageUrl.startsWith('/')) ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-lg object-cover bg-slate-900 border border-slate-800 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs flex items-center justify-center font-bold font-mono shrink-0">
                            PROD
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate leading-tight">{prod.name}</p>
                          <p className="text-[10px] text-amber-500 font-mono font-medium mt-0.5">R$ {prod.price}</p>
                          {prod.link && (
                            <a
                              href={prod.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[9px] text-slate-500 hover:text-slate-300 font-mono truncate block mt-0.5"
                            >
                              {prod.link.substring(0, 30)}...
                            </a>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 hover:text-red-300 transition shrink-0 cursor-pointer"
                          title="Remover produto"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

    </div>
  );
};
