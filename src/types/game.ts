export enum Biome {
  DEEP_WATER = 0,
  SHALLOW_WATER = 1,
  SAND = 2,
  GRASS = 3,
  FOREST = 4,
  MOUNTAIN = 5,
  SNOW = 6,
  LAVA = 7,
  SCORCHED = 8,
}

export type Race = 'humano' | 'elfo' | 'enano' | 'orco' | 'lobo' | 'oveja' | 'dragon';

export type NPCRole = 'ciudadano' | 'guerrero' | 'rey' | 'heroe' | 'profeta';

export type PersonalityTrait =
  | 'sabio'
  | 'belicoso'
  | 'codicioso'
  | 'piadoso'
  | 'paranoico'
  | 'compasivo'
  | 'orgulloso'
  | 'caotico'
  | 'romantico'
  | 'vengativo';

export type NarratorTone = 'epico' | 'comico' | 'oscuro' | 'infantil';

export type ToolCategory = 'terreno' | 'criaturas' | 'poderes' | 'inspector';

export type ToolId =
  // Terreno
  | 'subir_terreno'
  | 'bajar_terreno'
  | 'agua'
  | 'arena'
  | 'hierba'
  | 'bosque'
  | 'montana'
  | 'nieve'
  | 'lava'
  // Criaturas
  | 'humano'
  | 'elfo'
  | 'enano'
  | 'orco'
  | 'lobo'
  | 'oveja'
  | 'dragon'
  // Poderes
  | 'rayo'
  | 'lluvia'
  | 'terremoto'
  | 'meteorito'
  | 'plaga'
  | 'bendicion'
  | 'inspirar_profeta'
  // Inspector
  | 'inspeccionar';

export type CreatureState =
  | 'explorando'
  | 'buscando_comida'
  | 'construyendo'
  | 'combatiendo'
  | 'rezando'
  | 'migrando'
  | 'cortejando';

export interface NPCChatMessage {
  sender: 'dios' | 'npc';
  text: string;
  year: number;
  decision?: NPCDecisionPayload | null;
}

export type NPCDecisionAction =
  | 'declarar_guerra'
  | 'alianza'
  | 'migrar'
  | 'rezar'
  | 'rebelarse'
  | 'construir_templo'
  | 'ninguna';

export interface NPCDecisionPayload {
  accion: NPCDecisionAction;
  objetivo?: string;
  motivo: string;
}

export interface Creature {
  id: string;
  name: string;
  title?: string;
  race: Race;
  role: NPCRole;
  kingdomId: string | null;
  villageId: string | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  hp: number;
  maxHp: number;
  attack: number;
  hunger: number; // 0 to 100 (100 = full)
  age: number; // in years
  maxAge: number;
  traits: PersonalityTrait[];
  state: CreatureState;
  kills: number;
  level: number;
  // Dynasty & Relationships
  generation: number;
  dynastyName: string;
  parentIds: string[];
  spouseId: string | null;
  rivalId: string | null;
  childrenIds: string[];
  // Memory & Chat
  memory: string[];
  chatHistory: NPCChatMessage[];
  // Status FX
  infected: boolean;
  blessed: boolean;
  hitFlash: number;
  scaleX: number;
  scaleY: number;
  actionTimer: number;
  reproductionCooldown: number;
}

export type BuildingType = 'choza' | 'casa' | 'torre' | 'templo' | 'castillo' | 'granero';

export interface Building {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  villageId: string;
  kingdomId: string;
  hp: number;
  maxHp: number;
  level: number;
}

export interface Village {
  id: string;
  name: string;
  kingdomId: string;
  race: Race;
  centerX: number;
  centerY: number;
  radius: number;
  wood: number;
  stone: number;
  food: number;
  gold: number;
  population: number;
  foundedYear: number;
}

export type DiplomacyStatus = 'paz' | 'guerra' | 'alianza';

export interface Kingdom {
  id: string;
  name: string;
  race: Race;
  color: string;
  bannerBorder: string;
  motto: string;
  kingId: string | null;
  capitalVillageId: string | null;
  diplomacy: Record<string, DiplomacyStatus>;
  foundedYear: number;
  warsWon: number;
  totalKills: number;
  faith: number; // 0-100 devotion to player god
}

export type ChronicleEventType =
  | 'fundacion'
  | 'guerra'
  | 'paz'
  | 'desastre'
  | 'muerte_rey'
  | 'profecia'
  | 'romance'
  | 'rivalidad'
  | 'milagro'
  | 'cronica_ia';

export interface ChronicleEntry {
  id: string;
  year: number;
  title: string;
  text: string;
  tone: NarratorTone;
  type: ChronicleEventType;
  isAI: boolean;
  importance: 1 | 2 | 3;
}

export interface DivineChoiceOption {
  label: string;
  description: string;
  effectType: 'bendecir_reino' | 'castigar_reino' | 'forzar_paz' | 'desatar_guerra' | 'edad_oro' | 'invocar_heroe';
  targetKingdomId?: string;
}

export interface DivineChoiceEvent {
  id: string;
  year: number;
  title: string;
  description: string;
  prophetName: string;
  kingdomName: string;
  options: DivineChoiceOption[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedYear?: number;
}

export interface DivineObjective {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  completed: boolean;
  rewardText: string;
}

export interface DynastyMemberRecord {
  id: string;
  name: string;
  title: string;
  race: Race;
  role: NPCRole;
  dynastyName: string;
  generation: number;
  kingdomName: string;
  kingdomColor: string;
  birthYear: number;
  deathYear: number | null;
  kills: number;
  parentIds: string[];
  spouseName?: string;
  rivalName?: string;
  epitaph?: string;
}

export interface WorldState {
  seed: number;
  width: number;
  height: number;
  year: number;
  yearProgress: number;
  peaceYears: number;
  // Flattened 128x128 typed/numeric arrays (stored as regular number[] for JSON serialization)
  elevation: number[]; // 0..1
  moisture: number[]; // 0..1
  biomes: Biome[];
  fireTimers: number[]; // >0 if tile is burning
  treeDensity: number[]; // 0..3 trees per tile
  dirtyTerrain: boolean;
  dirtyTiles: number[]; // indices of changed tiles
  // Entities
  creatures: Creature[];
  buildings: Building[];
  villages: Village[];
  kingdoms: Kingdom[];
  // History & AI
  chronicles: ChronicleEntry[];
  pendingImportantEvents: string[];
  dynastyRecords: Record<string, DynastyMemberRecord>;
  achievements: Achievement[];
  objectives: DivineObjective[];
  activeDivineEvent: DivineChoiceEvent | null;
  // Stats counters
  stats: {
    totalDeaths: number;
    totalBirths: number;
    meteorsDropped: number;
    lightningsCast: number;
    blessingsCast: number;
    plaguesCast: number;
    warsDeclared: number;
    alliancesFormed: number;
  };
  // Camera shake / juice
  screenShake: number;
  hitstopTimer: number;
}

export const MAP_SIZE = 128;
export const TILE_PIXEL_SIZE = 8; // 128 * 8 = 1024x1024 world pixel space
