import React from 'react';
import {
  Achievement,
  DivineChoiceEvent,
  DivineObjective,
  DynastyMemberRecord,
  Kingdom,
  WorldState,
} from '../types/game';
import { soundEngine } from '../game/soundEngine';

export type ActiveModalType =
  | null
  | 'resumen'
  | 'dinastias'
  | 'logros'
  | 'pausa'
  | 'evento_divino';

interface ModalsProps {
  activeModal: ActiveModalType;
  onClose: () => void;
  world: WorldState;
  // World Summary
  worldSummaryText: string;
  isLoadingSummary: boolean;
  onRefreshSummary: () => void;
  // Divine Event
  divineEvent: DivineChoiceEvent | null;
  onChooseEventOption: (index: number) => void;
  // Save / Load / Reset
  onSaveWorld: () => void;
  onLoadWorld: () => void;
  hasSavedWorld: boolean;
  saveStatusMessage: string | null;
  onNewWorld: () => void;
  onReturnToTitle: () => void;
}

export const Modals: React.FC<ModalsProps> = ({
  activeModal,
  onClose,
  world,
  worldSummaryText,
  isLoadingSummary,
  onRefreshSummary,
  divineEvent,
  onChooseEventOption,
  onSaveWorld,
  onLoadWorld,
  hasSavedWorld,
  saveStatusMessage,
  onNewWorld,
  onReturnToTitle,
}) => {
  if (!activeModal && !divineEvent) return null;

  // Priority: if divineEvent is active or activeModal === 'evento_divino'
  if ((activeModal === 'evento_divino' || divineEvent) && divineEvent) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="divine-event-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto"
        style={{ backgroundColor: 'rgba(7, 12, 22, 0.82)' }}
      >
        <div
          className="w-full max-w-xl rounded-xl border-2 border-amber-400/70 p-6 shadow-2xl space-y-5"
          style={{ backgroundColor: '#111827' }}
        >
          <div className="space-y-1">
            <div className="text-xs font-mono-tabular text-amber-400 uppercase tracking-wider">
              Año {divineEvent.year} · Oráculo de {divineEvent.prophetName} ({divineEvent.kingdomName})
            </div>
            <h2 id="divine-event-title" className="font-display text-2xl font-bold text-amber-200">
              {divineEvent.title}
            </h2>
          </div>

          <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/90 p-4 rounded-lg border border-slate-800">
            {divineEvent.description}
          </p>

          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
              Elige tu Intervención Divina:
            </div>
            {divineEvent.options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  soundEngine.playBlessing();
                  onChooseEventOption(idx);
                }}
                className="w-full text-left p-3.5 rounded-lg border border-amber-500/35 hover:border-amber-400 bg-slate-900 hover:bg-slate-800/90 transition-all cursor-pointer group"
              >
                <div className="font-display text-sm font-bold text-amber-200 group-hover:text-amber-300">
                  {idx + 1}. {opt.label}
                </div>
                <div className="text-xs text-slate-300 mt-0.5">{opt.description}</div>
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Ignorar Plegaria por Ahora
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeModal === 'resumen') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto"
        style={{ backgroundColor: 'rgba(7, 12, 22, 0.82)' }}
      >
        <div
          className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-amber-500/50 shadow-2xl overflow-hidden"
          style={{ backgroundColor: '#111827' }}
        >
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#141D30]">
            <div>
              <h2 id="summary-modal-title" className="font-display text-xl font-bold text-amber-200">
                Gran Resumen de la Historia del Mundo
              </h2>
              <p className="text-xs text-slate-400">
                Síntesis narrativa de Aetheria hasta el Año {world.year}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isLoadingSummary}
                onClick={() => {
                  soundEngine.playClick();
                  onRefreshSummary();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {isLoadingSummary ? 'Redactando...' : 'Actualizar con IA'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Key World Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">Edad del Mundo</div>
                <div className="text-xl font-mono-tabular font-bold text-amber-300">
                  Año {world.year}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">Población Viva</div>
                <div className="text-xl font-mono-tabular font-bold text-emerald-300">
                  {world.creatures.length}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">Guerras Declaradas</div>
                <div className="text-xl font-mono-tabular font-bold text-red-400">
                  {world.stats.warsDeclared}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">Años de Paz</div>
                <div className="text-xl font-mono-tabular font-bold text-sky-300">
                  {world.peaceYears}
                </div>
              </div>
            </div>

            {/* AI Narrative Text */}
            <div className="p-5 rounded-xl bg-[#1B1814] border border-amber-900/50 text-[#F4EFE6] space-y-3">
              <h3 className="font-display text-sm font-bold text-amber-300 uppercase tracking-wider">
                Crónica General del Creador
              </h3>
              {isLoadingSummary ? (
                <p className="text-sm text-amber-200/80 animate-pulse">
                  El Cronista Inmortal está consultando los pergaminos del destino...
                </p>
              ) : (
                <div className="text-sm leading-relaxed whitespace-pre-line text-[#E5DEC9]">
                  {worldSummaryText}
                </div>
              )}
            </div>

            {/* Kingdoms & Diplomacy Overview */}
            <div className="space-y-2.5">
              <h3 className="font-display text-sm font-bold text-slate-200 uppercase tracking-wider">
                Estado Diplomático de los Reinos
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {world.kingdoms.map((k: Kingdom) => {
                  const pop = world.creatures.filter((c) => c.kingdomId === k.id).length;
                  const king = world.creatures.find((c) => c.id === k.kingId);
                  const wars = Object.entries(k.diplomacy)
                    .filter(([, st]) => st === 'guerra')
                    .map(([otherId]) => world.kingdoms.find((o) => o.id === otherId)?.name)
                    .filter(Boolean);

                  return (
                    <div
                      key={k.id}
                      className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold text-sm" style={{ color: k.color }}>
                          {k.name}
                        </span>
                        <span className="text-xs font-mono-tabular text-slate-300">
                          {pop} hab · Fe {k.faith}%
                        </span>
                      </div>
                      <div className="text-xs text-slate-300">
                        Monarca: <span className="font-semibold text-amber-200">{king ? king.name : 'Trono Vacante'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 italic">"{k.motto}"</div>
                      <div className="text-[11px] pt-1">
                        {wars.length > 0 ? (
                          <span className="text-red-400 font-semibold">
                            En guerra con: {wars.join(', ')}
                          </span>
                        ) : (
                          <span className="text-emerald-400">En paz con las naciones vecinas</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeModal === 'dinastias') {
    const records: DynastyMemberRecord[] = (Object.values(world.dynastyRecords) as DynastyMemberRecord[]).sort(
      (a, b) => a.birthYear - b.birthYear
    );
    // Group by dynastyName
    const grouped = new Map<string, DynastyMemberRecord[]>();
    for (const r of records) {
      const list = grouped.get(r.dynastyName) || [];
      list.push(r);
      grouped.set(r.dynastyName, list);
    }

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dynasty-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto"
        style={{ backgroundColor: 'rgba(7, 12, 22, 0.82)' }}
      >
        <div
          className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-xl border border-amber-500/50 shadow-2xl overflow-hidden"
          style={{ backgroundColor: '#111827' }}
        >
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#141D30]">
            <div>
              <h2 id="dynasty-modal-title" className="font-display text-xl font-bold text-amber-200">
                Árbol Genealógico de Dinastías y Líneas de Tiempo
              </h2>
              <p className="text-xs text-slate-400">
                Linajes reales, matrimonios, rivalidades y sucesiones desde el Año 1
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Cerrar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {Array.from(grouped.entries()).map(([dynastyName, members]) => (
              <div
                key={dynastyName}
                className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="font-display text-base font-bold text-amber-300">
                    {dynastyName}
                  </h3>
                  <span className="text-xs font-mono-tabular text-slate-400">
                    {members.length} figuras históricas · Máx. {Math.max(...members.map((m) => m.generation))}.ª Generación
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg bg-slate-950/90 border border-slate-800/90 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-100">
                          {m.name} <span className="text-amber-400/80 font-normal">({m.generation}.ª Gen)</span>
                        </span>
                        <span
                          className={`text-[11px] font-mono-tabular ${
                            m.deathYear ? 'text-slate-500' : 'text-emerald-400'
                          }`}
                        >
                          {m.deathYear ? `† Año ${m.deathYear}` : 'Vivo'}
                        </span>
                      </div>
                      <div className="text-slate-300 capitalize">
                        {m.title} · {m.race} · <span style={{ color: m.kingdomColor }}>{m.kingdomName}</span>
                      </div>
                      {(m.spouseName || m.rivalName || m.kills > 0) && (
                        <div className="text-[11px] text-slate-400 pt-0.5">
                          {m.spouseName && <span className="text-rose-300 mr-2">Cónyuge: {m.spouseName}</span>}
                          {m.rivalName && <span className="text-red-400 mr-2">Rival: {m.rivalName}</span>}
                          {m.kills > 0 && <span>Victorias: {m.kills}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeModal === 'logros') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="achievements-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto"
        style={{ backgroundColor: 'rgba(7, 12, 22, 0.82)' }}
      >
        <div
          className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-amber-500/50 shadow-2xl overflow-hidden"
          style={{ backgroundColor: '#111827' }}
        >
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#141D30]">
            <div>
              <h2 id="achievements-modal-title" className="font-display text-xl font-bold text-amber-200">
                Objetivos Divinos y Logros
              </h2>
              <p className="text-xs text-slate-400">
                Metas opcionales de Creador y trofeos desbloqueados en tu mundo
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Cerrar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Divine Objectives */}
            <div className="space-y-3">
              <h3 className="font-display text-sm font-bold text-amber-300 uppercase tracking-wider">
                Objetivos de Dios Activos
              </h3>
              {world.objectives.map((obj: DivineObjective) => {
                const pct = Math.min(100, Math.round((obj.current / obj.target) * 100));
                return (
                  <div
                    key={obj.id}
                    className={`p-4 rounded-lg border space-y-2 ${
                      obj.completed
                        ? 'bg-emerald-950/30 border-emerald-500/50'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-sm text-amber-100">
                        {obj.title}
                      </span>
                      <span className="text-xs font-mono-tabular text-amber-300">
                        {obj.current}/{obj.target} ({pct}%)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{obj.description}</p>
                    <div className="w-full h-2 bg-slate-950 rounded overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-transform duration-150 origin-left"
                        style={{ transform: `scaleX(${pct / 100})` }}
                      />
                    </div>
                    <div className="text-[11px] text-emerald-300">
                      Recompensa: {obj.rewardText} {obj.completed ? '(¡Completado!)' : ''}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Achievements */}
            <div className="space-y-3">
              <h3 className="font-display text-sm font-bold text-sky-300 uppercase tracking-wider">
                Logros del Panteón ({world.achievements.filter((a) => a.unlocked).length}/{world.achievements.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {world.achievements.map((ach: Achievement) => (
                  <div
                    key={ach.id}
                    className={`p-3.5 rounded-lg border space-y-1 ${
                      ach.unlocked
                        ? 'bg-amber-500/10 border-amber-400/50 text-amber-100'
                        : 'bg-slate-900/60 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-sm">{ach.title}</span>
                      <span className="text-[11px] font-mono-tabular">
                        {ach.unlocked ? `Año ${ach.unlockedYear || 1}` : 'Bloqueado'}
                      </span>
                    </div>
                    <p className="text-xs opacity-90">{ach.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pause & Save/Load Modal
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto"
      style={{ backgroundColor: 'rgba(7, 12, 22, 0.84)' }}
    >
      <div
        className="w-full max-w-md rounded-xl border border-amber-500/50 p-6 shadow-2xl space-y-5"
        style={{ backgroundColor: '#111827' }}
      >
        <div className="text-center space-y-1">
          <h2 id="pause-modal-title" className="font-display text-2xl font-bold text-amber-200">
            Santuario del Creador
          </h2>
          <p className="text-xs text-slate-400 font-mono-tabular">
            Semilla #{world.seed} · Año {world.year} · {world.creatures.length} habitantes
          </p>
        </div>

        {/* 3 Tabular Stat Tiles */}
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Reinos</div>
            <div className="text-base font-mono-tabular font-bold text-amber-300">
              {world.kingdoms.length}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Nacimientos</div>
            <div className="text-base font-mono-tabular font-bold text-emerald-300">
              {world.stats.totalBirths}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Crónicas</div>
            <div className="text-base font-mono-tabular font-bold text-sky-300">
              {world.chronicles.length}
            </div>
          </div>
        </div>

        {saveStatusMessage && (
          <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs text-center font-medium">
            {saveStatusMessage}
          </div>
        )}

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
          >
            Reanudar Simulación
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onSaveWorld}
              className="py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-200 font-semibold text-xs cursor-pointer"
            >
              Guardar en Navegador
            </button>
            <button
              type="button"
              disabled={!hasSavedWorld}
              onClick={onLoadWorld}
              className="py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-emerald-200 font-semibold text-xs cursor-pointer"
            >
              Cargar Guardado
            </button>
          </div>

          <button
            type="button"
            onClick={onNewWorld}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-xs cursor-pointer"
          >
            Generar Nuevo Mundo Procedural
          </button>

          <button
            type="button"
            onClick={onReturnToTitle}
            className="w-full py-2 px-4 rounded-lg text-slate-400 hover:text-white text-xs cursor-pointer"
          >
            Volver a la Pantalla de Título
          </button>
        </div>
      </div>
    </div>
  );
};
