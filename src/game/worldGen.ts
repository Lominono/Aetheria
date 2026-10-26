import {
  Achievement,
  Biome,
  Building,
  ChronicleEntry,
  Creature,
  DivineObjective,
  DynastyMemberRecord,
  Kingdom,
  MAP_SIZE,
  NPCRole,
  PersonalityTrait,
  Race,
  Village,
  WorldState,
} from '../types/game';

export class SeededRNG {
  private s: number;
  constructor(seed: number) {
    this.s = seed % 2147483647;
    if (this.s <= 0) this.s += 2147483646;
  }
  next(): number {
    this.s = (this.s * 16807) % 2147483647;
    return (this.s - 1) / 2147483646;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

function hash2D(x: number, y: number, seed: number): number {
  let n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export function valueNoise2D(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const u = smoothstep(xf);
  const v = smoothstep(yf);

  const aa = hash2D(xi, yi, seed);
  const ba = hash2D(xi + 1, yi, seed);
  const ab = hash2D(xi, yi + 1, seed);
  const bb = hash2D(xi + 1, yi + 1, seed);

  const x1 = aa + u * (ba - aa);
  const x2 = ab + u * (bb - ab);
  return x1 + v * (x2 - x1);
}

export function fbm2D(x: number, y: number, seed: number, octaves = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let maxVal = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * valueNoise2D(x * frequency, y * frequency, seed + i * 31);
    maxVal += amplitude;
    amplitude *= 0.5;
    frequency *= 2.02;
  }
  return value / maxVal;
}

export function computeBiomeFromHeightMoisture(elevation: number, moisture: number): Biome {
  if (elevation < 0.28) return Biome.DEEP_WATER;
  if (elevation < 0.36) return Biome.SHALLOW_WATER;
  if (elevation < 0.42) return Biome.SAND;
  if (elevation < 0.70) {
    return moisture > 0.53 ? Biome.FOREST : Biome.GRASS;
  }
  if (elevation < 0.84) return Biome.MOUNTAIN;
  return Biome.SNOW;
}

const NAME_PREFIXES: Record<Race, string[]> = {
  humano: ['Ald', 'Val', 'Cor', 'Thal', 'Rod', 'Bel', 'Gar', 'Luc', 'Mar', 'Elen', 'isa', 'Cas'],
  elfo: ['Ael', 'Syl', 'Lir', 'Fae', 'Thran', 'Gal', 'Cael', 'Elow', 'Mir', 'Vaer'],
  enano: ['Thor', 'Bal', 'Dur', 'Gim', 'Krag', 'Bram', 'Thrum', 'Mor', 'Kaz', 'Dor'],
  orco: ['Grom', 'Zug', 'Krog', 'Morg', 'Drak', 'Uruk', 'Gar', 'Thok', 'Brok', 'Gor'],
  lobo: ['Colmillo', 'Sombra', 'Aullido', 'Gris', 'Norte'],
  oveja: ['Nube', 'Copo', 'Vellón', 'Brisa', 'Prado'],
  dragon: ['Ignis', 'Valthor', 'Pyros', 'Ancalagon', 'Balerion'],
};

const NAME_SUFFIXES: Record<Race, string[]> = {
  humano: ['ric', 'мир', 'ius', 'ana', 'en', 'or', 'ia', 'ard', 'on', 'ela'],
  elfo: ['ion', 'riel', 'wyn', 'ith', 'las', 'dir', 'ora', 'ndil', 'ael'],
  enano: ['in', 'gar', 'din', 'rik', 'bur', 'ok', 'grim', 'bek', 'nar'],
  orco: ['ash', 'gul', 'mar', 'thar', 'nak', 'gor', 'zuk', 'mak', 'duk'],
  lobo: ['Veloz', 'Feroz', 'Nocturno', 'Plateado'],
  oveja: ['Blanco', 'Suave', 'Dulce', 'Tierno'],
  dragon: ['el Ardiente', 'el Eterno', 'Devastador', 'de Ceniza'],
};

const DYNASTY_NAMES: Record<Race, string[]> = {
  humano: ['Casa Solar', 'Dinastía Valoria', 'Sangre de Hierro', 'Linaje Áureo', 'Casa Tormenta'],
  elfo: ['Estirpe Lunar', 'Hijos del Alba', 'Canto Silvano', 'Hoja Eterna', 'Luz de Lirien'],
  enano: ['Clan Yunque', 'Martillo Profundo', 'Barba de Mithril', 'Roca Ígnea', 'Forja Real'],
  orco: ['Clan Cráneo Rojo', 'Furia de Sangre', 'Garra de Trueno', 'Colmillo Negro', 'Horda Ceniza'],
  lobo: ['Manada Sombría'],
  oveja: ['Rebaño Real'],
  dragon: ['Progenie del Fuego'],
};

const KINGDOM_NAMES: Record<Race, string[]> = {
  humano: ['Reino de Valoria', 'Imperio de Solaria', 'Corona de Alderon', 'Bastión de Oakhaven'],
  elfo: ['Dominio de Lothlórien', 'Bosque de Aelindor', 'Corte de Sylvanor', 'Santuario de Elowen'],
  enano: ['Fortaleza de Khazad', 'Cumbres de Durinor', 'Reino Bajo la Montaña', 'Citadela de Hierro'],
  orco: ['Horda de Gorgoroth', 'Clanes de Krogmar', 'Bastión de Ceniza', 'Imperio de Colmillo'],
  lobo: ['Manada Salvaje'],
  oveja: ['Pradera Libre'],
  dragon: ['Nido de Fuego'],
};

const KINGDOM_MOTTOS: Record<Race, string[]> = {
  humano: [
    'Honor, Trigo y Acero',
    'Por la Corona y el Sol',
    'Firmes ante la Tempestad',
    'La Luz Guía Nuestras Espadas',
  ],
  elfo: [
    'Bajo las Estrellas Eternas',
    'El Bosque Jamás Olvida',
    'Gracia y Flechas Certeras',
    'Guardianes de la Raíz Antigua',
  ],
  enano: [
    'Piedra, Oro y Juramento',
    'Inquebrantables como la Montaña',
    'Forjados en el Fuego Profundo',
    'Ninguna Deuda sin Saldar',
  ],
  orco: [
    'Sangre y Conquista',
    'El Fuerte Manda, el Débil Cae',
    'Ceniza para Nuestros Enemigos',
    'Rugido que Rompe Escudos',
  ],
  lobo: ['Cazar en la Noche'],
  oveja: ['Paz en el Prado'],
  dragon: ['Todo Arderá'],
};

export const ALL_TRAITS: PersonalityTrait[] = [
  'sabio',
  'belicoso',
  'codicioso',
  'piadoso',
  'paranoico',
  'compasivo',
  'orgulloso',
  'caotico',
  'romantico',
  'vengativo',
];

export const KINGDOM_PALETTES: Record<Race, { color: string; border: string }[]> = {
  humano: [
    { color: '#3B82F6', border: '#93C5FD' },
    { color: '#2563EB', border: '#FDE047' },
    { color: '#0EA5E9', border: '#E0F2FE' },
  ],
  elfo: [
    { color: '#10B981', border: '#A7F3D0' },
    { color: '#059669', border: '#FDE68A' },
    { color: '#14B8A6', border: '#99F6E4' },
  ],
  enano: [
    { color: '#F59E0B', border: '#FEF08A' },
    { color: '#D97706', border: '#FDE047' },
    { color: '#EA580C', border: '#FED7AA' },
  ],
  orco: [
    { color: '#EF4444', border: '#FCA5A5' },
    { color: '#DC2626', border: '#FDBA74' },
    { color: '#B91C1C', border: '#FECACA' },
  ],
  lobo: [{ color: '#64748B', border: '#CBD5E1' }],
  oveja: [{ color: '#F8FAFC', border: '#E2E8F0' }],
  dragon: [{ color: '#F97316', border: '#FEF08A' }],
};

let idCounter = 1;
export function nextEntityId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Math.floor(Math.random() * 1000)}`;
}

export function generateCharacterName(race: Race, rng?: SeededRNG): string {
  const prefixes = NAME_PREFIXES[race] || NAME_PREFIXES.humano;
  const suffixes = NAME_SUFFIXES[race] || NAME_SUFFIXES.humano;
  if (rng) {
    const p = rng.pick(prefixes);
    const s = rng.pick(suffixes);
    return race === 'lobo' || race === 'oveja' || race === 'dragon' ? `${p} ${s}` : `${p}${s}`;
  }
  const p = prefixes[Math.floor(Math.random() * prefixes.length)];
  const s = suffixes[Math.floor(Math.random() * suffixes.length)];
  return race === 'lobo' || race === 'oveja' || race === 'dragon' ? `${p} ${s}` : `${p}${s}`;
}

export function isCivilizedRace(race: Race): boolean {
  return race === 'humano' || race === 'elfo' || race === 'enano' || race === 'orco';
}

export function isWalkableBiome(biome: Biome, race?: Race): boolean {
  if (race === 'dragon') return true;
  return biome !== Biome.DEEP_WATER && biome !== Biome.LAVA;
}

export function createCreature(
  race: Race,
  x: number,
  y: number,
  role: NPCRole = 'ciudadano',
  kingdomId: string | null = null,
  villageId: string | null = null,
  rng?: SeededRNG,
  customDynasty?: string,
  generation: number = 1
): Creature {
  const baseStats: Record<Race, { hp: number; atk: number; maxAge: number }> = {
    humano: { hp: 100, atk: 12, maxAge: 75 },
    elfo: { hp: 90, atk: 15, maxAge: 180 },
    enano: { hp: 145, atk: 16, maxAge: 130 },
    orco: { hp: 135, atk: 20, maxAge: 65 },
    lobo: { hp: 65, atk: 14, maxAge: 25 },
    oveja: { hp: 40, atk: 2, maxAge: 18 },
    dragon: { hp: 550, atk: 55, maxAge: 500 },
  };

  const st = baseStats[race];
  const roleMultiplier = role === 'rey' ? 1.6 : role === 'heroe' ? 1.8 : role === 'profeta' ? 1.25 : 1.0;
  const maxHp = Math.round(st.hp * roleMultiplier);

  const t1 = rng ? rng.pick(ALL_TRAITS) : ALL_TRAITS[Math.floor(Math.random() * ALL_TRAITS.length)];
  let t2 = rng ? rng.pick(ALL_TRAITS) : ALL_TRAITS[Math.floor(Math.random() * ALL_TRAITS.length)];
  if (t2 === t1) t2 = 'sabio';

  const dynasties = DYNASTY_NAMES[race] || DYNASTY_NAMES.humano;
  const dynastyName =
    customDynasty || (rng ? rng.pick(dynasties) : dynasties[Math.floor(Math.random() * dynasties.length)]);

  const name = generateCharacterName(race, rng);
  const title =
    role === 'rey'
      ? 'Monarca Supremo'
      : role === 'heroe'
        ? 'Campeón Legendario'
        : role === 'profeta'
          ? 'Vidente del Cosmos'
          : undefined;

  return {
    id: nextEntityId('npc'),
    name,
    title,
    race,
    role,
    kingdomId,
    villageId,
    x,
    y,
    vx: 0,
    vy: 0,
    targetX: x,
    targetY: y,
    hp: maxHp,
    maxHp,
    attack: Math.round(st.atk * roleMultiplier),
    hunger: 90,
    age: role === 'rey' || role === 'heroe' || role === 'profeta' ? 22 : 16,
    maxAge: st.maxAge,
    traits: [t1, t2],
    state: 'explorando',
    kills: 0,
    level: role === 'rey' || role === 'heroe' ? 3 : 1,
    generation,
    dynastyName,
    parentIds: [],
    spouseId: null,
    rivalId: null,
    childrenIds: [],
    memory: [`Nació en las tierras de Aetheria (${race}).`],
    chatHistory: [],
    infected: false,
    blessed: false,
    hitFlash: 0,
    scaleX: 1,
    scaleY: 1,
    actionTimer: 1 + Math.random() * 2,
    reproductionCooldown: 12 + Math.random() * 10,
  };
}

export function getInitialAchievements(): Achievement[] {
  return [
    {
      id: 'primer_rey',
      title: 'Primer Rey Coronado',
      description: 'Observa o funda un reino gobernado por un monarca.',
      unlocked: true,
      unlockedYear: 1,
    },
    {
      id: 'voz_divina',
      title: 'Voz del Cielo',
      description: 'Habla directamente con un Rey, Héroe o Profeta mediante el chat divino.',
      unlocked: false,
    },
    {
      id: 'apocalipsis',
      title: 'Fuego del Juicio',
      description: 'Lanza al menos 3 meteoritos o 5 rayos sobre el mundo.',
      unlocked: false,
    },
    {
      id: 'edad_dorada',
      title: 'Imperio Próspero',
      description: 'Alcanza una población mundial de 65 o más criaturas.',
      unlocked: false,
    },
    {
      id: 'paz_100',
      title: 'Paz Centenaria',
      description: 'Mantén el mundo sin guerras activas durante 25 años seguidos.',
      unlocked: false,
    },
    {
      id: 'dinastia_eterna',
      title: 'Sangre Real',
      description: 'Logra que una dinastía alcance la 3.ª generación.',
      unlocked: false,
    },
  ];
}

export function getInitialObjectives(): DivineObjective[] {
  return [
    {
      id: 'obj_poblacion',
      title: 'Multiplicad la Vida',
      description: 'Haz crecer la población total del mundo hasta 60 habitantes.',
      current: 28,
      target: 60,
      completed: false,
      rewardText: 'Bendición Celestial de Fertilidad',
    },
    {
      id: 'obj_ciudades',
      title: 'Arquitecto de Civilizaciones',
      description: 'Consigue que las civilizaciones construyan 18 edificios en total.',
      current: 8,
      target: 18,
      completed: false,
      rewardText: 'Auge Constructivo',
    },
    {
      id: 'obj_dialogo',
      title: 'Oráculo Viviente',
      description: 'Conversa con un líder mortal o toma una decisión en un Evento Divino.',
      current: 0,
      target: 1,
      completed: false,
      rewardText: 'Devoción +25 en todos los reinos',
    },
  ];
}

export function generateWorld(seed: number = Date.now() % 100000): WorldState {
  const rng = new SeededRNG(seed);
  const width = MAP_SIZE;
  const height = MAP_SIZE;
  const total = width * height;

  const elevation = new Array<number>(total);
  const moisture = new Array<number>(total);
  const biomes = new Array<Biome>(total);
  const fireTimers = new Array<number>(total).fill(0);
  const treeDensity = new Array<number>(total).fill(0);

  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      // Island radial falloff so edges are ocean and center has continents & archipelago
      const dx = (x - cx) / (width * 0.48);
      const dy = (y - cy) / (height * 0.48);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const falloff = Math.max(0, 1 - Math.pow(dist, 2.15));

      const rawElev = fbm2D(x / 26, y / 26, seed, 4);
      const detail = fbm2D(x / 10, y / 10, seed + 99, 2) * 0.15;
      const elev = Math.min(1, Math.max(0, (rawElev * 0.88 + detail) * (0.35 + 0.85 * falloff)));

      const moist = fbm2D(x / 22, y / 22, seed + 555, 3);

      elevation[idx] = elev;
      moisture[idx] = moist;
      const b = computeBiomeFromHeightMoisture(elev, moist);
      biomes[idx] = b;

      if (b === Biome.FOREST) {
        treeDensity[idx] = rng.int(1, 3);
      } else if (b === Biome.GRASS && rng.next() < 0.14) {
        treeDensity[idx] = 1;
      }
    }
  }

  const creatures: Creature[] = [];
  const buildings: Building[] = [];
  const villages: Village[] = [];
  const kingdoms: Kingdom[] = [];
  const dynastyRecords: Record<string, DynastyMemberRecord> = {};

  // Find 4 fertile land spots in the 4 quadrants for initial kingdoms: Humano, Elfo, Enano, Orco
  const starterRaces: { race: Race; qx: [number, number]; qy: [number, number]; preferredBiomes: Biome[] }[] = [
    { race: 'humano', qx: [22, 56], qy: [22, 56], preferredBiomes: [Biome.GRASS, Biome.SAND] },
    { race: 'elfo', qx: [70, 106], qy: [22, 56], preferredBiomes: [Biome.FOREST, Biome.GRASS] },
    { race: 'enano', qx: [22, 56], qy: [70, 106], preferredBiomes: [Biome.MOUNTAIN, Biome.GRASS] },
    { race: 'orco', qx: [70, 106], qy: [70, 106], preferredBiomes: [Biome.GRASS, Biome.SAND, Biome.FOREST] },
  ];

  starterRaces.forEach((starter, index) => {
    let bestX = Math.floor((starter.qx[0] + starter.qx[1]) / 2);
    let bestY = Math.floor((starter.qy[0] + starter.qy[1]) / 2);
    let found = false;

    for (let attempt = 0; attempt < 160; attempt++) {
      const tx = rng.int(starter.qx[0], starter.qx[1]);
      const ty = rng.int(starter.qy[0], starter.qy[1]);
      const b = biomes[ty * width + tx];
      if (starter.preferredBiomes.includes(b)) {
        bestX = tx;
        bestY = ty;
        found = true;
        break;
      }
    }

    // If quadrant happens to be water, raise a small fertile island at bestX, bestY
    if (!found) {
      for (let oy = -6; oy <= 6; oy++) {
        for (let ox = -6; ox <= 6; ox++) {
          const d = Math.sqrt(ox * ox + oy * oy);
          if (d <= 6) {
            const nx = Math.min(width - 2, Math.max(1, bestX + ox));
            const ny = Math.min(height - 2, Math.max(1, bestY + oy));
            const nIdx = ny * width + nx;
            elevation[nIdx] = 0.52;
            biomes[nIdx] = starter.preferredBiomes[0];
            if (biomes[nIdx] === Biome.FOREST) treeDensity[nIdx] = 2;
          }
        }
      }
    }

    const kId = `reino_${index + 1}`;
    const vId = `aldea_${index + 1}`;
    const palette = KINGDOM_PALETTES[starter.race][0];
    const kName = KINGDOM_NAMES[starter.race][index % KINGDOM_NAMES[starter.race].length];
    const motto = rng.pick(KINGDOM_MOTTOS[starter.race]);
    const dynastyName = DYNASTY_NAMES[starter.race][0];

    // Create King
    const king = createCreature(starter.race, bestX, bestY, 'rey', kId, vId, rng, dynastyName, 1);
    king.memory.push(`Coronado como primer monarca de ${kName} en el Año 1.`);
    creatures.push(king);

    dynastyRecords[king.id] = {
      id: king.id,
      name: king.name,
      title: king.title || 'Rey Fundador',
      race: king.race,
      role: 'rey',
      dynastyName: king.dynastyName,
      generation: 1,
      kingdomName: kName,
      kingdomColor: palette.color,
      birthYear: 1,
      deathYear: null,
      kills: 0,
      parentIds: [],
    };

    // Create Hero & Prophet
    const hero = createCreature(
      starter.race,
      bestX + rng.range(-2, 2),
      bestY + rng.range(-2, 2),
      'heroe',
      kId,
      vId,
      rng,
      dynastyName,
      1
    );
    hero.memory.push(`Juró proteger ${kName} con su espada.`);
    creatures.push(hero);

    dynastyRecords[hero.id] = {
      id: hero.id,
      name: hero.name,
      title: hero.title || 'Campeón',
      race: hero.race,
      role: 'heroe',
      dynastyName: hero.dynastyName,
      generation: 1,
      kingdomName: kName,
      kingdomColor: palette.color,
      birthYear: 1,
      deathYear: null,
      kills: 0,
      parentIds: [],
    };

    // Create 4 citizens + 1 prophet for first two kingdoms
    for (let c = 0; c < 4; c++) {
      const role: NPCRole = c === 0 && index < 2 ? 'profeta' : c === 1 ? 'guerrero' : 'ciudadano';
      const citizen = createCreature(
        starter.race,
        bestX + rng.range(-3.5, 3.5),
        bestY + rng.range(-3.5, 3.5),
        role,
        kId,
        vId,
        rng,
        dynastyName,
        1
      );
      if (role === 'profeta') {
        citizen.memory.push(`Escuchó susurros divinos en los vientos de ${kName}.`);
        dynastyRecords[citizen.id] = {
          id: citizen.id,
          name: citizen.name,
          title: 'Vidente del Cosmos',
          race: citizen.race,
          role: 'profeta',
          dynastyName: citizen.dynastyName,
          generation: 1,
          kingdomName: kName,
          kingdomColor: palette.color,
          birthYear: 1,
          deathYear: null,
          kills: 0,
          parentIds: [],
        };
      }
      creatures.push(citizen);
    }

    // Create initial buildings (Castle + Hut)
    buildings.push({
      id: nextEntityId('bld'),
      type: 'castillo',
      x: bestX,
      y: bestY,
      villageId: vId,
      kingdomId: kId,
      hp: 350,
      maxHp: 350,
      level: 1,
    });

    buildings.push({
      id: nextEntityId('bld'),
      type: 'casa',
      x: Math.min(width - 2, Math.max(1, bestX + 2)),
      y: Math.min(height - 2, Math.max(1, bestY + 1)),
      villageId: vId,
      kingdomId: kId,
      hp: 160,
      maxHp: 160,
      level: 1,
    });

    villages.push({
      id: vId,
      name: kName.replace('Reino de ', '').replace('Imperio de ', '').replace('Dominio de ', ''),
      kingdomId: kId,
      race: starter.race,
      centerX: bestX,
      centerY: bestY,
      radius: 11,
      wood: 35,
      stone: 25,
      food: 60,
      gold: 20,
      population: 6,
      foundedYear: 1,
    });

    kingdoms.push({
      id: kId,
      name: kName,
      race: starter.race,
      color: palette.color,
      bannerBorder: palette.border,
      motto,
      kingId: king.id,
      capitalVillageId: vId,
      diplomacy: {},
      foundedYear: 1,
      warsWon: 0,
      totalKills: 0,
      faith: 65,
    });
  });

  // Initialize peaceful diplomacy between all starter kingdoms
  for (const k1 of kingdoms) {
    for (const k2 of kingdoms) {
      if (k1.id !== k2.id) {
        k1.diplomacy[k2.id] = 'paz';
      }
    }
  }

  // Spawn some wild sheep and wolves on grass/forest
  for (let i = 0; i < 10; i++) {
    const wx = rng.int(16, width - 16);
    const wy = rng.int(16, height - 16);
    const b = biomes[wy * width + wx];
    if (b === Biome.GRASS || b === Biome.FOREST) {
      const animalRace: Race = i < 7 ? 'oveja' : 'lobo';
      creatures.push(createCreature(animalRace, wx, wy, 'ciudadano', null, null, rng));
    }
  }

  const initialChronicles: ChronicleEntry[] = [
    {
      id: 'chron_genesis',
      year: 1,
      title: 'El Amanecer de Aetheria',
      text: `En el Año 1 de la Creación, las aguas primordiales se abrieron y cuatro grandes estirpes alzaron sus estandartes: ${kingdoms
        .map((k) => k.name)
        .join(', ')}. Los mortales miran al cielo aguardando tus milagros o tu cólera.`,
      tone: 'epico',
      type: 'fundacion',
      isAI: false,
      importance: 3,
    },
  ];

  return {
    seed,
    width,
    height,
    year: 1,
    yearProgress: 0,
    peaceYears: 1,
    elevation,
    moisture,
    biomes,
    fireTimers,
    treeDensity,
    dirtyTerrain: true,
    dirtyTiles: [],
    creatures,
    buildings,
    villages,
    kingdoms,
    chronicles: initialChronicles,
    pendingImportantEvents: [
      `Año 1: Se fundaron ${kingdoms.length} reinos iniciales (${kingdoms.map((k) => k.name).join(', ')}).`,
    ],
    dynastyRecords,
    achievements: getInitialAchievements(),
    objectives: getInitialObjectives(),
    activeDivineEvent: null,
    stats: {
      totalDeaths: 0,
      totalBirths: creatures.length,
      meteorsDropped: 0,
      lightningsCast: 0,
      blessingsCast: 0,
      plaguesCast: 0,
      warsDeclared: 0,
      alliancesFormed: 0,
    },
    screenShake: 0,
    hitstopTimer: 0,
  };
}

export function getTilesInBrush(
  centerX: number,
  centerY: number,
  brushRadius: number,
  width = MAP_SIZE,
  height = MAP_SIZE
): { x: number; y: number; idx: number; dist: number }[] {
  const result: { x: number; y: number; idx: number; dist: number }[] = [];
  const r = Math.max(0, Math.floor(brushRadius));
  const minX = Math.max(0, Math.floor(centerX - r));
  const maxX = Math.min(width - 1, Math.ceil(centerX + r));
  const minY = Math.max(0, Math.floor(centerY - r));
  const maxY = Math.min(height - 1, Math.ceil(centerY + r));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= r + 0.35) {
        result.push({ x, y, idx: y * width + x, dist });
      }
    }
  }
  return result;
}
