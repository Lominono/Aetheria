import React, { useState } from 'react';
import { Creature, Kingdom } from '../types/game';
import { soundEngine } from '../game/soundEngine';

interface NPCInspectorModalProps {
  npc: Creature;
  kingdom?: Kingdom;
  spouseName?: string;
  rivalName?: string;
  onClose: () => void;
  onSendMessage: (message: string) => Promise<void>;
  onBlessNPC: () => void;
  onSmiteNPC: () => void;
  isSendingChat: boolean;
}

const QUICK_PROMPTS = [
  '¿Cuál es tu misión y qué opinas de nuestro reino?',
  '¡Te ordeno declarar la guerra a nuestros rivales!',
  'Busca la paz y sella una alianza con el reino vecino.',
  'Construye un gran templo sagrado en mi honor.',
];

export const NPCInspectorModal: React.FC<NPCInspectorModalProps> = ({
  npc,
  kingdom,
  spouseName,
  rivalName,
  onClose,
  onSendMessage,
  onBlessNPC,
  onSmiteNPC,
  isSendingChat,
}) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSendingChat) return;
    setInputText('');
    await onSendMessage(trimmed);
  };

  const hpPct = Math.max(0, Math.min(100, Math.round((npc.hp / npc.maxHp) * 100)));
  const hungerPct = Math.max(0, Math.min(100, Math.round(npc.hunger)));

  return (
    <aside
      aria-label={`Inspector de personaje: ${npc.name}`}
      className="fixed top-16 left-3 bottom-32 z-30 w-[calc(100vw-24px)] sm:w-80 md:w-88 flex flex-col rounded-xl border border-amber-500/45 shadow-2xl overflow-hidden pointer-events-auto"
      style={{ backgroundColor: 'rgba(11, 16, 27, 0.96)' }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-amber-500/30 bg-[#131B2E] flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-bold text-amber-200">{npc.name}</h2>
            <span className="text-xs font-mono-tabular text-amber-400">Nv.{npc.level}</span>
          </div>
          <p className="text-xs text-slate-300 capitalize">
            {npc.title || npc.role} · {npc.race} · {npc.dynastyName} ({npc.generation}.ª Gen)
          </p>
          {kingdom && (
            <p className="text-xs font-semibold mt-0.5" style={{ color: kingdom.color }}>
              {kingdom.name}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onClose();
          }}
          aria-label="Cerrar inspector de personaje"
          className="px-2 py-1 text-xs text-slate-400 hover:text-white rounded cursor-pointer"
        >
          Cerrar
        </button>
      </div>

      {/* Scrollable Body: Stats, Relationships, Memory & AI Chat */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Vital Bars & Tabular Stats */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono-tabular">
            <span className="text-slate-300">
              Salud: {Math.round(npc.hp)}/{npc.maxHp} ({hpPct}%)
            </span>
            <span className="text-slate-300">Edad: {npc.age}/{npc.maxAge} años</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-transform duration-150 origin-left"
              style={{ transform: `scaleX(${hpPct / 100})` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono-tabular pt-1">
            <span className="text-slate-300">Nutrición: {hungerPct}/100</span>
            <span className="text-slate-300">Victorias: {npc.kills}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-transform duration-150 origin-left"
              style={{ transform: `scaleX(${hungerPct / 100})` }}
            />
          </div>
        </div>

        {/* Traits, Relationships & Quick Divine Actions */}
        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
          <div>
            <span className="text-slate-400">Personalidad: </span>
            <span className="text-amber-200 font-medium capitalize">{npc.traits.join(' · ')}</span>
          </div>
          <div>
            <span className="text-slate-400">Estado actual: </span>
            <span className="text-sky-300 capitalize">{npc.state.replace('_', ' ')}</span>
            {npc.blessed && <span className="text-amber-300"> · Bendecido</span>}
            {npc.infected && <span className="text-purple-400"> · Infectado</span>}
          </div>
          {spouseName && (
            <div>
              <span className="text-slate-400">Romance / Cónyuge: </span>
              <span className="text-rose-300 font-medium">{spouseName}</span>
            </div>
          )}
          {rivalName && (
            <div>
              <span className="text-slate-400">Rival Jurado: </span>
              <span className="text-red-400 font-medium">{rivalName}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onBlessNPC}
              className="flex-1 py-1.5 px-2.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-semibold text-xs cursor-pointer whitespace-nowrap"
            >
              Bendecir Mortal
            </button>
            <button
              type="button"
              onClick={onSmiteNPC}
              className="flex-1 py-1.5 px-2.5 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 font-semibold text-xs cursor-pointer whitespace-nowrap"
            >
              Fulminar con Rayo
            </button>
          </div>
        </div>

        {/* Personal Memory */}
        <div className="space-y-1">
          <h3 className="text-xs font-display font-bold text-amber-300 uppercase tracking-wider">
            Memoria del Personaje
          </h3>
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 max-h-24 overflow-y-auto space-y-1 text-[11px] text-slate-300">
            {npc.memory.slice(-6).map((m, i) => (
              <div key={i}>• {m}</div>
            ))}
          </div>
        </div>

        {/* AI Divine Dialogue Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-display font-bold text-sky-300 uppercase tracking-wider">
            Voz de Dios (Chat con IA)
          </h3>

          {/* Quick Divine Commands */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isSendingChat}
                onClick={() => onSendMessage(q)}
                className="text-left px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 hover:text-amber-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                {q.length > 36 ? `${q.slice(0, 36)}…` : q}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="p-3 rounded-lg bg-[#141A29] border border-slate-800 min-h-[120px] max-h-48 overflow-y-auto space-y-2.5 text-xs">
            {npc.chatHistory.length === 0 ? (
              <p className="text-slate-400 italic text-[11px]">
                Habla directamente en la mente de {npc.name}. Responderá según su personalidad y podrá tomar decisiones reales (declarar guerras, forjar alianzas, alzar templos o rebelarse).
              </p>
            ) : (
              npc.chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg ${
                    msg.sender === 'dios'
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-100 ml-4'
                      : 'bg-slate-900 border border-slate-700 text-slate-200 mr-2'
                  }`}
                >
                  <div className="text-[10px] font-bold text-amber-400/90 mb-0.5">
                    {msg.sender === 'dios' ? 'Tú (Creador)' : npc.name} · Año {msg.year}
                  </div>
                  <p className="leading-relaxed">{msg.text}</p>
                  {msg.decision && msg.decision.accion !== 'ninguna' && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-700/80 text-[11px] text-sky-300 font-mono-tabular">
                      Decisión IA ejecutada: {msg.decision.accion.toUpperCase()}
                      {msg.decision.objetivo ? ` -> ${msg.decision.objetivo}` : ''}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Chat Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-slate-800 bg-[#131B2E] flex items-center gap-2"
      >
        <label htmlFor="divine-chat-input" className="sr-only">
          Hablar con {npc.name}
        </label>
        <input
          id="divine-chat-input"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Susurrar a ${npc.name}...`}
          disabled={isSendingChat}
          className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          disabled={isSendingChat || !inputText.trim()}
          className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs cursor-pointer whitespace-nowrap"
        >
          {isSendingChat ? '...' : 'Enviar'}
        </button>
      </form>
    </aside>
  );
};
