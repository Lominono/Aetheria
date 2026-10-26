import React, { useState } from 'react';
import { ChronicleEntry, Creature, Kingdom, NarratorTone } from '../types/game';
import { soundEngine } from '../game/soundEngine';

interface ChroniclePanelProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  chronicles: ChronicleEntry[];
  tone: NarratorTone;
  onChangeTone: (tone: NarratorTone) => void;
  onTriggerAIChronicle: () => void;
  onTriggerDivineEvent: () => void;
  isGeneratingAI: boolean;
  notableNPCs: Creature[];
  kingdoms: Kingdom[];
  onSelectNPC: (npc: Creature) => void;
}

const TONE_OPTIONS: { id: NarratorTone; label: string }[] = [
  { id: 'epico', label: 'Épico' },
  { id: 'comico', label: 'Cómico' },
  { id: 'oscuro', label: 'Oscuro' },
  { id: 'infantil', label: 'Fábula' },
];

export const ChroniclePanel: React.FC<ChroniclePanelProps> = ({
  isOpen,
  onToggleOpen,
  chronicles,
  tone,
  onChangeTone,
  onTriggerAIChronicle,
  onTriggerDivineEvent,
  isGeneratingAI,
  notableNPCs,
  kingdoms,
  onSelectNPC,
}) => {
  const [activeTab, setActiveTab] = useState<'cronicas' | 'lideres'>('cronicas');

  if (!isOpen) {
    return (
      <div className="fixed top-16 right-3 z-30 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onToggleOpen();
          }}
          className="px-3.5 py-2.5 rounded-lg border border-amber-500/40 text-amber-200 font-display text-xs font-bold shadow-xl hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
          style={{ backgroundColor: 'rgba(11, 16, 27, 0.94)' }}
        >
          Abrir Crónicas ({chronicles.length})
        </button>
      </div>
    );
  }

  const kingdomMap = new Map(kingdoms.map((k) => [k.id, k]));

  return (
    <aside
      aria-label="Panel de Crónicas y Líderes"
      className="fixed top-16 right-3 bottom-32 z-30 w-[calc(100vw-24px)] sm:w-80 md:w-88 flex flex-col rounded-xl border border-amber-500/40 shadow-2xl overflow-hidden pointer-events-auto"
      style={{ backgroundColor: 'rgba(14, 19, 30, 0.95)' }}
    >
      {/* Header & Tabs */}
      <div className="px-3 py-2.5 border-b border-amber-500/25 flex items-center justify-between gap-1.5 bg-[#131B2E]">
        <div className="flex items-center gap-1 min-w-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('cronicas');
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-display font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'cronicas'
                ? 'bg-amber-500 text-slate-950'
                : 'text-amber-200/80 hover:text-amber-100 hover:bg-slate-800'
            }`}
          >
            Crónicas ({chronicles.length})
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('lideres');
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-display font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'lideres'
                ? 'bg-amber-500 text-slate-950'
                : 'text-amber-200/80 hover:text-amber-100 hover:bg-slate-800'
            }`}
          >
            Reyes y Héroes ({notableNPCs.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onToggleOpen();
          }}
          aria-label="Plegar panel de crónicas"
          className="px-2 py-1 text-xs text-slate-300 hover:text-white bg-slate-900/80 rounded border border-slate-700/80 cursor-pointer shrink-0 whitespace-nowrap"
        >
          Ocultar
        </button>
      </div>

      {activeTab === 'cronicas' ? (
        <>
          {/* Tone Selector & Manual AI Trigger Bar */}
          <div className="px-4 py-2.5 border-b border-slate-800 space-y-2 bg-slate-950/60">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] text-slate-400 font-medium">Tono del Narrador:</span>
              <div className="flex items-center gap-1">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onChangeTone(t.id);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      tone === t.id
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-400/50'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isGeneratingAI}
                onClick={() => {
                  soundEngine.playClick();
                  onTriggerAIChronicle();
                }}
                className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {isGeneratingAI ? 'Consultando al Cronista...' : 'Narrar Crónica IA'}
              </button>
              <button
                type="button"
                disabled={isGeneratingAI}
                onClick={() => {
                  soundEngine.playClick();
                  onTriggerDivineEvent();
                }}
                className="py-1.5 px-3 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50 text-sky-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                Evento Divino
              </button>
            </div>
          </div>

          {/* Parchment-styled Chronicle Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chronicles.map((entry) => (
              <article
                key={entry.id}
                className="p-3 rounded-lg border border-amber-900/40 bg-[#1B1814] text-[#F4EFE6] space-y-1"
              >
                <div className="flex items-center justify-between text-[11px] text-amber-400/80 font-mono-tabular">
                  <span>
                    Año {entry.year} · {entry.isAI ? 'Crónica IA' : 'Anales del Mundo'}
                  </span>
                  <span className="capitalize text-amber-500/70">{entry.type.replace('_', ' ')}</span>
                </div>
                <h3 className="font-display text-sm font-bold text-amber-200">{entry.title}</h3>
                <p className="text-xs text-[#E5DEC9] leading-relaxed">{entry.text}</p>
              </article>
            ))}
          </div>
        </>
      ) : (
        /* Notable NPCs (Kings, Heroes, Prophets) Quick Selector */
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <p className="text-xs text-slate-400 mb-2">
            Haz clic en cualquier Monarca, Héroe o Profeta para enfocar la cámara y hablar con él como su Dios:
          </p>
          {notableNPCs.length === 0 ? (
            <div className="text-xs text-slate-500 py-8 text-center">
              No hay líderes notables vivos en este instante. Usa las herramientas para crear nuevas civilizaciones.
            </div>
          ) : (
            notableNPCs.map((npc) => {
              const k = npc.kingdomId ? kingdomMap.get(npc.kingdomId) : undefined;
              return (
                <button
                  key={npc.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onSelectNPC(npc);
                  }}
                  className="w-full text-left p-3 rounded-lg border border-slate-800 hover:border-amber-500/50 bg-slate-900/80 hover:bg-slate-900 transition-colors cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-amber-200">
                      {npc.name}
                    </span>
                    <span className="text-[11px] font-mono-tabular text-slate-400">
                      {npc.age} años · Nv.{npc.level}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="capitalize font-semibold text-amber-400">{npc.role}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="capitalize">{npc.race}</span>
                    <span aria-hidden="true"> · </span>
                    <span style={{ color: k?.color || '#94A3B8' }}>
                      {k?.name || 'Errante'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Rasgos: {npc.traits.join(', ')} · {npc.dynastyName}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </aside>
  );
};
