import React from 'react';
import { ToolCategory, ToolId } from '../types/game';
import { soundEngine } from '../game/soundEngine';

export interface ToolDefinition {
  id: ToolId;
  category: ToolCategory;
  label: string;
  clue: string;
  keyHint: string;
  accentColor: string;
}

export const GOD_TOOLS: ToolDefinition[] = [
  // Inspector
  {
    id: 'inspeccionar',
    category: 'inspector',
    label: 'Lupa Divina',
    clue: 'Inspeccionar y hablar con Reyes, Héroes o Criaturas',
    keyHint: '1',
    accentColor: '#38BDF8',
  },
  // Criaturas
  {
    id: 'humano',
    category: 'criaturas',
    label: 'Humanos',
    clue: 'Constructores versátiles · Fundan reinos y aldeas',
    keyHint: '2',
    accentColor: '#3B82F6',
  },
  {
    id: 'elfo',
    category: 'criaturas',
    label: 'Elfos',
    clue: 'Arqueros longevos · Guardianes de los bosques',
    keyHint: '3',
    accentColor: '#10B981',
  },
  {
    id: 'enano',
    category: 'criaturas',
    label: 'Enanos',
    clue: 'Guerreros resistentes · Maestros de la montaña',
    keyHint: '4',
    accentColor: '#F59E0B',
  },
  {
    id: 'orco',
    category: 'criaturas',
    label: 'Orcos',
    clue: 'Clanes feroces · Alto daño cuerpo a cuerpo',
    keyHint: '5',
    accentColor: '#EF4444',
  },
  {
    id: 'oveja',
    category: 'criaturas',
    label: 'Ovejas',
    clue: 'Fauna pacífica · Alimento para los reinos',
    keyHint: '6',
    accentColor: '#F8FAFC',
  },
  {
    id: 'lobo',
    category: 'criaturas',
    label: 'Lobos',
    clue: 'Depredadores veloces · Cazan en manada',
    keyHint: '7',
    accentColor: '#94A3B8',
  },
  {
    id: 'dragon',
    category: 'criaturas',
    label: 'Dragón',
    clue: 'Bestia colosal · Vuela sobre todo terreno y escupe fuego',
    keyHint: '8',
    accentColor: '#F97316',
  },
  // Poderes Divinos
  {
    id: 'bendicion',
    category: 'poderes',
    label: 'Bendición',
    clue: 'Cura, sacia el hambre y aumenta el poder (+25%)',
    keyHint: 'Q',
    accentColor: '#FDE047',
  },
  {
    id: 'lluvia',
    category: 'poderes',
    label: 'Lluvia Fértil',
    clue: 'Apaga incendios, hace crecer bosques y nutre cosechas',
    keyHint: 'E',
    accentColor: '#38BDF8',
  },
  {
    id: 'inspirar_profeta',
    category: 'poderes',
    label: 'Profeta IA',
    clue: 'Ungir a un mortal como Profeta con conciencia divina',
    keyHint: 'F',
    accentColor: '#A7F3D0',
  },
  {
    id: 'rayo',
    category: 'poderes',
    label: 'Rayo Celestial',
    clue: 'Descarga eléctrica · Quema árboles y daña criaturas',
    keyHint: 'R',
    accentColor: '#FEF08A',
  },
  {
    id: 'meteorito',
    category: 'poderes',
    label: 'Meteorito',
    clue: 'Impacto devastador · Crea cráteres de lava y fuego',
    keyHint: 'T',
    accentColor: '#EF4444',
  },
  {
    id: 'terremoto',
    category: 'poderes',
    label: 'Terremoto',
    clue: 'Altera placas tectónicas y levanta cordilleras',
    keyHint: 'Y',
    accentColor: '#A8A29E',
  },
  {
    id: 'plaga',
    category: 'poderes',
    label: 'Plaga',
    clue: 'Infección contagiosa que debilita a las civilizaciones',
    keyHint: 'U',
    accentColor: '#A855F7',
  },
  // Terreno
  {
    id: 'subir_terreno',
    category: 'terreno',
    label: 'Elevar Tierra',
    clue: 'Aumenta la altitud del terreno (Agua -> Tierra -> Montaña)',
    keyHint: 'Z',
    accentColor: '#A3E635',
  },
  {
    id: 'bajar_terreno',
    category: 'terreno',
    label: 'Hundir Tierra',
    clue: 'Reduce la altitud del terreno (Montaña -> Valle -> Mar)',
    keyHint: 'X',
    accentColor: '#38BDF8',
  },
  {
    id: 'hierba',
    category: 'terreno',
    label: 'Pradera',
    clue: 'Pinta llanuras fértiles ideales para fundar aldeas',
    keyHint: 'C',
    accentColor: '#4ADE80',
  },
  {
    id: 'bosque',
    category: 'terreno',
    label: 'Bosque',
    clue: 'Planta árboles densos que proveen madera',
    keyHint: 'V',
    accentColor: '#16A34A',
  },
  {
    id: 'arena',
    category: 'terreno',
    label: 'Playa / Arena',
    clue: 'Pinta costas cálidas y dunas doradas',
    keyHint: 'B',
    accentColor: '#FACC15',
  },
  {
    id: 'montana',
    category: 'terreno',
    label: 'Montaña',
    clue: 'Roca rica en minerales · Preferida por los Enanos',
    keyHint: 'N',
    accentColor: '#94A3B8',
  },
  {
    id: 'nieve',
    category: 'terreno',
    label: 'Cumbres Nevadas',
    clue: 'Hielo perpetuo en las alturas del mundo',
    keyHint: 'M',
    accentColor: '#F8FAFC',
  },
  {
    id: 'agua',
    category: 'terreno',
    label: 'Océano',
    clue: 'Inunda el terreno con aguas profundas',
    keyHint: 'G',
    accentColor: '#0284C7',
  },
  {
    id: 'lava',
    category: 'terreno',
    label: 'Magma',
    clue: 'Roca fundida incandescente que quema lo que toca',
    keyHint: 'H',
    accentColor: '#EA580C',
  },
];

interface GodToolbarProps {
  activeCategory: ToolCategory;
  onSelectCategory: (cat: ToolCategory) => void;
  activeTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
  brushRadius: number;
  onSelectBrushRadius: (r: number) => void;
}

const BRUSH_SIZES = [
  { label: '1×', radius: 0 },
  { label: '3×', radius: 1 },
  { label: '5×', radius: 2 },
  { label: '9×', radius: 4 },
];

export const GodToolbar: React.FC<GodToolbarProps> = ({
  activeCategory,
  onSelectCategory,
  activeTool,
  onSelectTool,
  brushRadius,
  onSelectBrushRadius,
}) => {
  const currentToolDef = GOD_TOOLS.find((t) => t.id === activeTool) || GOD_TOOLS[0];
  const visibleTools =
    activeCategory === 'inspector'
      ? GOD_TOOLS.filter((t) => t.category === 'inspector' || t.category === 'poderes').slice(0, 5)
      : GOD_TOOLS.filter((t) => t.category === activeCategory);

  return (
    <div className="fixed bottom-2.5 left-1/2 -translate-x-1/2 z-30 w-[96vw] max-w-3xl pointer-events-auto">
      <div
        className="rounded-xl border border-amber-500/35 px-3 py-2 shadow-2xl"
        style={{ backgroundColor: 'rgba(11, 16, 27, 0.95)' }}
      >
        {/* Top Row: Category Tabs + Active Tool Clue + Brush Size Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-800">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto" role="tablist" aria-label="Categorías de herramientas de dios">
            {(
              [
                { id: 'poderes', label: 'Poderes' },
                { id: 'criaturas', label: 'Criaturas' },
                { id: 'terreno', label: 'Terreno' },
                { id: 'inspector', label: 'Oráculo' },
              ] as { id: ToolCategory; label: string }[]
            ).map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    soundEngine.playClick();
                    onSelectCategory(cat.id);
                    const firstInCat = GOD_TOOLS.find((t) => t.category === cat.id);
                    if (firstInCat) onSelectTool(firstInCat.id);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Active Tool Name + Role/Effect Clue */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-300 truncate max-w-xs">
            <span className="font-bold text-amber-300">{currentToolDef.label}</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-400 truncate">{currentToolDef.clue}</span>
          </div>

          {/* Brush Size Selector */}
          <div className="flex items-center gap-1" aria-label="Tamaño del pincel">
            <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline">Pincel:</span>
            {BRUSH_SIZES.map((b) => {
              const active = brushRadius === b.radius;
              return (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onSelectBrushRadius(b.radius);
                  }}
                  className={`px-2 py-0.5 rounded text-xs font-mono-tabular font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-400/60'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Row: Tool Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Always keep Lupa Inspector accessible on the left */}
          {activeCategory !== 'inspector' && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onSelectTool('inspeccionar');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTool === 'inspeccionar'
                  ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-md'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
              title="Seleccionar criatura en el mapa para ver su mente y chatear"
            >
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: '#38BDF8' }}
              />
              <span>Inspeccionar</span>
            </button>
          )}

          {visibleTools.map((tool) => {
            const isSelected = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onSelectTool(tool.id);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 text-amber-100 shadow-md'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ backgroundColor: tool.accentColor }}
                />
                <span>{tool.label}</span>
                <span className="text-[10px] font-mono-tabular text-slate-500">[{tool.keyHint}]</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
