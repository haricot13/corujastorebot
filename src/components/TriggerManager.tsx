import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sliders, Plus, Search, Trash2, Edit2, Check, X, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';
import { Trigger } from '../types';

interface TriggerManagerProps {
  triggers: Trigger[];
  onAddTrigger: (newTrigger: Omit<Trigger, 'id'>) => void;
  onToggleTrigger: (id: string) => void;
  onDeleteTrigger: (id: string) => void;
  onUpdateTrigger: (id: string, updatedReply: string, updatedKeyword: string) => void;
}

export const TriggerManager: React.FC<TriggerManagerProps> = ({
  triggers,
  onAddTrigger,
  onToggleTrigger,
  onDeleteTrigger,
  onUpdateTrigger
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  
  // State for creating a new trigger
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newReply, setNewReply] = useState('');
  const [newCategory, setNewCategory] = useState('Geral');
  
  // State for editing a trigger
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingKeyword, setEditingKeyword] = useState('');
  const [editingReply, setEditingReply] = useState('');

  // Extract unique categories for filter tabs
  const categories = ['Todos', ...Array.from(new Set(triggers.map(t => t.category)))];

  // Filtering triggers
  const filteredTriggers = triggers.filter(trigger => {
    const matchesSearch = 
      trigger.keyword.toLowerCase().includes(search.toLowerCase()) || 
      trigger.reply.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || trigger.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSubmitNewTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim() || !newReply.trim()) return;

    onAddTrigger({
      keyword: newKeyword.trim().toLowerCase(),
      reply: newReply.trim(),
      isRegex: false,
      isActive: true,
      category: newCategory
    });

    setNewKeyword('');
    setNewReply('');
    setNewCategory('Geral');
    setShowAddForm(false);
  };

  const handleStartEdit = (trigger: Trigger) => {
    setEditingId(trigger.id);
    setEditingKeyword(trigger.keyword);
    setEditingReply(trigger.reply);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingKeyword.trim() || !editingReply.trim()) return;
    onUpdateTrigger(id, editingReply.trim(), editingKeyword.trim().toLowerCase());
    setEditingId(null);
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800/80 p-5 gold-glow shadow-xl relative h-full flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sliders size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-white">Gatilhos de Automação (WhatsApp)</h3>
              <p className="text-xs text-slate-400">Gerencie respostas instantâneas acionadas por palavras-chave</p>
            </div>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95"
          >
            {showAddForm ? <X size={14} /> : <Plus size={14} />}
            <span>{showAddForm ? 'Fechar' : 'Novo Gatilho'}</span>
          </button>
        </div>

        {/* Form to Add New Trigger */}
        <AnimatePresence>
          {showAddForm && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleSubmitNewTrigger}
              className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 mb-4 space-y-3 overflow-hidden"
            >
              <div className="text-xs font-bold font-display text-amber-400 flex items-center gap-1">
                <Sparkles size={12} />
                <span>CADASTRAR NOVO PIO DE RESPOSTA</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase">Palavra-Gatilho (ex: cupom)</label>
                  <input
                    type="text"
                    required
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Palavra simples ou frase"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-hidden transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase">Categoria</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-hidden cursor-pointer"
                  >
                    <option value="Geral">Geral</option>
                    <option value="Boas-vindas">Boas-vindas</option>
                    <option value="Menu">Menu</option>
                    <option value="Desconto">Desconto</option>
                    <option value="Suporte">Suporte</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase">Resposta automática (WhatsApp)</label>
                <textarea
                  required
                  value={newReply}
                  rows={3}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder="Escreva como o bot responderá. Use *palavra* para texto em negrito!"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 text-slate-200 text-xs rounded-lg p-3 focus:outline-hidden transition"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg hover:bg-slate-900 text-slate-400 text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition"
                >
                  Salvar Gatilho
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-slate-500">
              <Search size={14} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por gatilho ou resposta..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-hidden transition"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto select-none no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Triggers Listing Table/Grid */}
        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
          {filteredTriggers.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
              <ShieldAlert className="mx-auto text-slate-600 mb-2" size={24} />
              <p className="text-xs text-slate-500">Nenhum gatilho encontrado para a busca atual</p>
            </div>
          ) : (
            filteredTriggers.map((trigger) => {
              const isEditing = editingId === trigger.id;
              
              return (
                <div
                  key={trigger.id}
                  className={`rounded-xl border p-3.5 transition-all duration-200 ${
                    trigger.isActive 
                      ? 'bg-slate-950/50 border-slate-800/80 hover:border-amber-500/10'
                      : 'bg-slate-950/20 border-slate-900/40 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {/* Keyword Title Line */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-amber-400 font-mono uppercase bg-amber-500/10 px-1.5 rounded">Keyword</span>
                            <input
                              type="text"
                              value={editingKeyword}
                              onChange={(e) => setEditingKeyword(e.target.value)}
                              className="bg-slate-900 border border-slate-800 focus:border-amber-500 text-slate-200 text-xs px-2 py-1 rounded w-60 focus:outline-hidden"
                            />
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-amber-400 font-mono uppercase bg-amber-500/10 px-1.5 rounded w-max">Resposta</span>
                            <textarea
                              value={editingReply}
                              onChange={(e) => setEditingReply(e.target.value)}
                              rows={3}
                              className="bg-slate-900 border border-slate-800 focus:border-amber-500 text-slate-200 text-xs p-2 rounded w-full focus:outline-hidden"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-xs font-mono border border-amber-500/20 uppercase font-bold">
                            "{trigger.keyword}"
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-900 text-slate-400 text-[10px]">
                            {trigger.category}
                          </span>
                        </div>
                      )}

                      {/* Display Reply Text (when not editing) */}
                      {!isEditing && (
                        <p className="text-xs text-slate-300 font-light whitespace-pre-wrap leading-relaxed border-l-2 border-amber-500/10 pl-2.5 mt-2">
                          {trigger.reply}
                        </p>
                      )}
                    </div>

                    {/* Actions and Toggle status */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {/* Toggle status control */}
                      <button
                        onClick={() => onToggleTrigger(trigger.id)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition ${
                          trigger.isActive
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {trigger.isActive ? 'Ativo' : 'Pausado'}
                      </button>

                      {/* Edit Delete buttons Row */}
                      <div className="flex items-center gap-1 mt-1.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(trigger.id)}
                              className="p-1 px-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition"
                              title="Salvar alterações"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 px-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 transition"
                              title="Cancelar edição"
                            >
                              <X size={12} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEdit(trigger)}
                              className="p-1.5 rounded-md hover:bg-slate-800 hover:text-amber-400 text-slate-400 transition"
                              title="Editar Gatilho"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => onDeleteTrigger(trigger.id)}
                              className="p-1.5 rounded-md hover:bg-slate-800 hover:text-rose-400 text-slate-500 transition"
                              title="Excluir Gatilho"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Help tooltip tip */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 text-[10px] text-slate-500 flex items-center gap-1">
        <HelpCircle size={12} className="text-amber-500/60 shrink-0" />
        <span>Os gatilhos usam correspondência de texto flexível. Se o cliente digitar algo que inclua a palavra-chave ativa, o Coruja Store Bot responderá no simulador.</span>
      </div>
    </div>
  );
};
