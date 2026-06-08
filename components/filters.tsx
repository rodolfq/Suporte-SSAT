'use client';

import React from 'react';
import { Calendar, UserSearch, ThumbsUp, Clock, BarChart2, RefreshCw, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface FiltersProps {
  onApply: (filters: { collaborators: string[] }) => void;
  availableCollaborators: string[];
}

export default function Filters({ onApply, availableCollaborators }: FiltersProps) {
  const [selectedCollabs, setSelectedCollabs] = React.useState<string[]>([]);
  const [manualCollabs, setManualCollabs] = React.useState<string[]>([]);
  const [newName, setNewName] = React.useState('');

  const allCollabs = Array.from(new Set([...availableCollaborators, ...manualCollabs])).sort();

  const toggleCollab = (name: string) => {
    setSelectedCollabs(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const addManual = () => {
    if (newName.trim() && !allCollabs.includes(newName.trim())) {
      setManualCollabs(prev => [...prev, newName.trim()]);
      setSelectedCollabs(prev => [...prev, newName.trim()]);
      setNewName('');
    }
  };

  const removeManual = (name: string) => {
    setManualCollabs(prev => prev.filter(n => n !== name));
    setSelectedCollabs(prev => prev.filter(n => n !== name));
  };

  return (
    <aside className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 overflow-y-auto shadow-2xl">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Filtros</h2>
        </div>
        <button 
          onClick={() => setSelectedCollabs([])}
          className="text-xs font-semibold text-primary hover:underline uppercase tracking-wider"
        >
          Limpar
        </button>
      </div>

      <div className="p-6 space-y-8">
        {/* Período */}
        <div className="space-y-4">
          <label className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Calendar className="w-4 h-4" />
            Período
          </label>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <button className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400"><ChevronLeft className="w-3 h-3" /></button>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Março 2026</span>
              <button className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400"><ChevronRight className="w-3 h-3" /></button>
            </div>
            <div className="grid grid-cols-7 text-[10px] text-center text-slate-400 dark:text-slate-500 font-bold mb-2">
              <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: 31 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`h-6 flex items-center justify-center text-[10px] rounded-full cursor-pointer transition-colors ${
                    i + 1 === 12 ? 'bg-primary text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Colaborador */}
        <div className="space-y-3">
          <label className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <UserSearch className="w-4 h-4" />
            Colaboradores
          </label>
          
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addManual()}
              placeholder="Adicionar manual..."
              className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <button 
              onClick={addManual}
              className="p-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {allCollabs.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic p-2">Nenhum colaborador encontrado.</p>
            )}
            {allCollabs.map((name) => (
              <div key={name} className="group flex items-center justify-between p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <label className="flex items-center gap-3 flex-1 cursor-pointer py-1">
                  <input 
                    type="checkbox" 
                    checked={selectedCollabs.includes(name)}
                    onChange={() => toggleCollab(name)}
                    className="rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary w-4 h-4 bg-transparent" 
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">{name}</span>
                </label>
                {manualCollabs.includes(name) && (
                  <button 
                    onClick={() => removeManual(name)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 dark:text-slate-500 hover:text-red-500 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Avaliação Mínima */}
        <div className="space-y-3">
          <label className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <ThumbsUp className="w-4 h-4" />
            Avaliação Mínima
          </label>
          <div className="flex items-center gap-1 justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="flex gap-0.5 text-primary">
              <ThumbsUp className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-primary">4.0+</span>
          </div>
          <input type="range" min="1" max="5" step="0.5" defaultValue="4" className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary" />
        </div>

        {/* Tempo de Resposta */}
        <div className="space-y-3">
          <label className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Clock className="w-4 h-4" />
            Tempo Máx. Resposta
          </label>
          <select 
            defaultValue="Até 15 minutos"
            className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary py-2.5 text-slate-900 dark:text-slate-100"
          >
            <option className="dark:bg-slate-900">Até 5 minutos</option>
            <option className="dark:bg-slate-900">Até 15 minutos</option>
            <option className="dark:bg-slate-900">Até 1 hora</option>
            <option className="dark:bg-slate-900">Qualquer tempo</option>
          </select>
        </div>
      </div>

      <div className="mt-auto p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
        <button 
          onClick={() => onApply({ collaborators: selectedCollabs })}
          className="w-full bg-primary text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
        >
          <RefreshCw className="w-4 h-4" />
          Aplicar Filtros
        </button>
      </div>
    </aside>
  );
}