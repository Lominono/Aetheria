import React from 'react';

interface TitleScreenProps {
  onStart: () => void;
  onNewSeed: () => void;
  hasSavedWorld: boolean;
  onLoadSaved: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  onNewSeed,
  hasSavedWorld,
  onLoadSaved,
}) => {
  return (
    <div
      className="fixed inset-0 z-40 flex flex-col justify-between p-6 md:p-12 pointer-events-auto"
      style={{
        background:
          'linear-gradient(90deg, rgba(7, 14, 26, 0.92) 0%, rgba(7, 14, 26, 0.72) 48%, rgba(7, 14, 26, 0.18) 100%)',
      }}
    >
      {/* Top subtle world identity mark */}
      <div className="flex items-center justify-between">
        <div className="text-xs tracking-widest uppercase text-amber-300/80 font-semibold">
          Simulador de Dioses · Mundo Vivo 128×128 con IA
        </div>
      </div>

      {/* Left-third negative space composition with custom inline SVG Title Emblem */}
      <div className="max-w-xl my-auto space-y-6">
        <div className="flex items-center gap-4">
          <svg
            viewBox="0 0 64 64"
            className="w-16 h-16 shrink-0"
            aria-hidden="true"
          >
            {/* Dark outer silhouette */}
            <circle cx="32" cy="32" r="30" fill="#0B101B" stroke="#F59E0B" strokeWidth="2.5" />
            {/* Sunburst rays */}
            <path
              d="M32 6 L36 18 L48 14 L42 25 L56 32 L42 39 L48 50 L36 46 L32 58 L28 46 L16 50 L22 39 L8 32 L22 25 L16 14 L28 18 Z"
              fill="#D97706"
              opacity="0.35"
            />
            {/* World Crown & All-Seeing Divine Eye */}
            <path
              d="M16 38 L22 22 L32 30 L42 22 L48 38 Z"
              fill="#FDE047"
              stroke="#78350F"
              strokeWidth="1.5"
            />
            <circle cx="32" cy="31" r="4.5" fill="#38BDF8" />
            <circle cx="32" cy="31" r="2" fill="#FFFFFF" />
            <path d="M14 42 H50" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" />
          </svg>

          <div>
            <h1
              className="font-display text-4xl md:text-5xl font-extrabold tracking-tight text-[#FFFBEB]"
              style={{ textShadow: '0 4px 16px rgba(0,0,0,0.85)' }}
            >
              AETHERIA
            </h1>
            <p className="font-display text-sm md:text-base tracking-widest text-amber-400 uppercase font-semibold">
              Crónicas Divinas
            </p>
          </div>
        </div>

        <p
          className="text-sm md:text-base text-slate-200 leading-relaxed max-w-lg"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
        >
          Moldea continentes, desata cataclismos e inspira civilizaciones. Cada monarca, héroe y profeta posee memoria y voluntad impulsadas por IA, mientras el Cronista Inmortal narra la leyenda de tu creación en tiempo real.
        </p>

        {/* Primary CTA & <= 3 menu actions */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStart();
            }}
            className="px-7 py-3.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-sm md:text-base rounded-lg shadow-lg transition-transform duration-150 active:scale-95 cursor-pointer whitespace-nowrap"
          >
            Entrar al Mundo
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onNewSeed();
            }}
            className="px-5 py-3.5 bg-slate-900/90 hover:bg-slate-800 text-amber-200 border border-amber-500/40 font-semibold text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            Generar Otro Mapa
          </button>

          {hasSavedWorld && (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onLoadSaved();
              }}
              className="px-5 py-3.5 bg-emerald-950/90 hover:bg-emerald-900 text-emerald-200 border border-emerald-500/40 font-semibold text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Cargar Mundo Guardado
            </button>
          )}
        </div>
      </div>

      {/* Flat borderless control hints in the bottom safe margin */}
      <div className="text-xs text-slate-300/90 tracking-wide">
        WASD o Arrastrar Mover Cámara · Rueda del Ratón Zoom · Clic Izquierdo Usar Herramienta · Espacio Pausa · P Menú
      </div>
    </div>
  );
};
